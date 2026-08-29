import VERTEX_SHADER from './shaders/fullscreen.vert.glsl';
import BLUR_SHADER from './shaders/bloom-blur.frag.glsl';
import COMPOSITE_SHADER from './shaders/bloom-composite.frag.glsl';

interface ProgramInfo {
  program: WebGLProgram;
  position: number;
}

interface ProgramSet {
  blur: ProgramInfo;
  composite: ProgramInfo;
}

interface ParallelShaderCompileExtension {
  readonly COMPLETION_STATUS_KHR: number;
}

const PROGRAM_CACHE = new WeakMap<WebGL2RenderingContext, Promise<ProgramSet>>();
let shaderWarmupCanvas: HTMLCanvasElement | null = null;
let shaderWarmupPromise: Promise<void> | null = null;

const nextCompilationCheck = (): Promise<void> => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
  else setTimeout(resolve, 0);
});

async function compileProgram(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
  parallel: ParallelShaderCompileExtension | null,
): Promise<ProgramInfo> {
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    throw new Error('Could not create WebGL2 shader program');
  }

  gl.shaderSource(vertex, VERTEX_SHADER);
  gl.shaderSource(fragment, fragmentSource);
  gl.compileShader(vertex);
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  if (parallel) {
    while (!gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      await nextCompilationCheck();
    }
  } else await nextCompilationCheck();

  const vertexCompiled = gl.getShaderParameter(vertex, gl.COMPILE_STATUS);
  const fragmentCompiled = gl.getShaderParameter(fragment, gl.COMPILE_STATUS);
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  const message = !vertexCompiled
    ? gl.getShaderInfoLog(vertex)
    : !fragmentCompiled
      ? gl.getShaderInfoLog(fragment)
      : !linked ? gl.getProgramInfoLog(program) : null;
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!vertexCompiled || !fragmentCompiled || !linked) {
    gl.deleteProgram(program);
    throw new Error(message || 'Unknown WebGL2 shader compilation error');
  }
  return { program, position: gl.getAttribLocation(program, 'a_position') };
}

function getCachedPrograms(gl: WebGL2RenderingContext): Promise<ProgramSet> {
  const cached = PROGRAM_CACHE.get(gl);
  if (cached) return cached;
  const parallel = gl.getExtension('KHR_parallel_shader_compile') as ParallelShaderCompileExtension | null;
  const pending = Promise.all([
    compileProgram(gl, BLUR_SHADER, parallel),
    compileProgram(gl, COMPOSITE_SHADER, parallel),
  ]).then(([blur, composite]) => ({ blur, composite }));
  PROGRAM_CACHE.set(gl, pending);
  void pending.catch(() => PROGRAM_CACHE.delete(gl));
  return pending;
}

/**
 * Warms the browser/driver shader cache after page load. WebGL programs are
 * context-owned, so the actual canvas still links asynchronously and then
 * keeps its own cached ProgramSet for the lifetime of that context.
 */
export function preloadBloomShaders(): Promise<void> {
  if (shaderWarmupPromise) return shaderWarmupPromise;
  shaderWarmupCanvas = document.createElement('canvas');
  shaderWarmupCanvas.width = 1;
  shaderWarmupCanvas.height = 1;
  const gl = createBloomWebGLContext(shaderWarmupCanvas);
  if (!gl) return Promise.resolve();
  shaderWarmupPromise = getCachedPrograms(gl).then(() => undefined).catch(() => undefined);
  return shaderWarmupPromise;
}

export interface ShieldDistortion {
  /** Drawing-buffer pixel coordinates, using WebGL's bottom-left origin. */
  centerX: number;
  centerY: number;
  radius: number;
  radiusScale: number;
  active: boolean;
  sides: number;
  rotation: number;
  hitStrength: number;
  color: readonly [number, number, number];
  rippleAge: number;
  time: number;
}

export const MAX_SHIELD_DISTORTIONS = 16;
export const MAX_SINGULARITY = 16;

export interface SplitDistortion {
  centerX: number;
  centerY: number;
  radius: number;
  phase: number;
  color: readonly [number, number, number];
}

export interface SingularityDistortion {
  centerX: number;
  centerY: number;
  radius: number;
  strength: number;
}

export function createBloomWebGLContext(output: HTMLCanvasElement): WebGL2RenderingContext | null {
  return output.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
}

/**
 * GPU postprocessor. The game can remain on Canvas 2D, while the final scene and
 * emissive effect layer are uploaded as textures for two-pass blur and compositing.
 */
export class WebGLBloomPipeline {
  private readonly emissive = document.createElement('canvas');
  private readonly emissiveCtx: CanvasRenderingContext2D;
  private gl: WebGL2RenderingContext;
  private blurProgram!: ProgramInfo;
  private compositeProgram!: ProgramInfo;
  private quad!: WebGLBuffer;
  private sceneTexture!: WebGLTexture;
  private emissiveTexture!: WebGLTexture;
  private pingTexture!: WebGLTexture;
  private pongTexture!: WebGLTexture;
  private pingFramebuffer!: WebGLFramebuffer;
  private pongFramebuffer!: WebGLFramebuffer;
  private cssWidth = 1;
  private cssHeight = 1;
  private dpr = 1;
  private blurWidth = 1;
  private blurHeight = 1;
  private contextLost = false;
  private programsReady = false;
  private initializationError: Error | null = null;
  private initializationVersion = 0;
  private disposed = false;
  private readonly uniformLocations = new WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  private readonly shieldGeometry = new Float32Array(MAX_SHIELD_DISTORTIONS * 4);
  private readonly shieldShape = new Float32Array(MAX_SHIELD_DISTORTIONS * 4);
  private readonly shieldEffect = new Float32Array(MAX_SHIELD_DISTORTIONS * 4);
  private readonly singularityCenters = new Float32Array(MAX_SINGULARITY * 2);
  private readonly singularityRadii = new Float32Array(MAX_SINGULARITY);
  private readonly singularityStrengths = new Float32Array(MAX_SINGULARITY);
  private readonly emissiveScale = 0.5;
  private readonly blurScale = 0.25;

  constructor(
    private readonly output: HTMLCanvasElement,
    context?: WebGL2RenderingContext,
  ) {
    const emissiveCtx = this.emissive.getContext('2d', { alpha: true });
    if (!emissiveCtx) throw new Error('Emissive Canvas 2D context is unavailable');
    this.emissiveCtx = emissiveCtx;

    const gl = context ?? createBloomWebGLContext(output);
    if (!gl) throw new Error('WebGL is required for the game renderer');
    this.gl = gl;
    this.initializeResources();
    this.initializePrograms();

    output.addEventListener('webglcontextlost', this.handleContextLost);
    output.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.cssWidth = Math.max(1, cssWidth);
    this.cssHeight = Math.max(1, cssHeight);
    this.dpr = Math.max(1, dpr);
    const outputWidth = Math.max(1, Math.round(this.cssWidth * this.dpr));
    const outputHeight = Math.max(1, Math.round(this.cssHeight * this.dpr));
    const emissiveWidth = Math.max(1, Math.round(outputWidth * this.emissiveScale));
    const emissiveHeight = Math.max(1, Math.round(outputHeight * this.emissiveScale));
    this.blurWidth = Math.max(1, Math.round(outputWidth * this.blurScale));
    this.blurHeight = Math.max(1, Math.round(outputHeight * this.blurScale));

    if (this.output.width !== outputWidth || this.output.height !== outputHeight) {
      this.output.width = outputWidth;
      this.output.height = outputHeight;
    }
    if (this.emissive.width !== emissiveWidth || this.emissive.height !== emissiveHeight) {
      this.emissive.width = emissiveWidth;
      this.emissive.height = emissiveHeight;
    }
    if (!this.contextLost) this.allocateTargets();
  }

  beginFrame(offsetX: number, offsetY: number, worldScale: number): CanvasRenderingContext2D {
    const ctx = this.emissiveCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.emissive.width, this.emissive.height);
    const pixelRatio = this.dpr * this.emissiveScale;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.translate(offsetX, offsetY);
    ctx.scale(worldScale, worldScale);
    ctx.imageSmoothingEnabled = true;
    return ctx;
  }

  render(
    scene: HTMLCanvasElement,
    shields: readonly ShieldDistortion[] = [],
    split: SplitDistortion | null = null,
    singularities: readonly SingularityDistortion[] = [],
    time = 0,
  ): void {
    if (this.initializationError) {
      const error = this.initializationError;
      this.initializationError = null;
      throw error;
    }
    if (!this.programsReady) return;
    if (this.contextLost) return;
    const gl = this.gl;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    this.upload(this.sceneTexture, scene);
    this.upload(this.emissiveTexture, this.emissive);

    this.blur(this.emissiveTexture, this.pingFramebuffer, 1 / this.blurWidth, 0);
    this.blur(this.pingTexture, this.pongFramebuffer, 0, 1 / this.blurHeight);
    this.composite(shields, split, singularities, time);
  }

  dispose(): void {
    this.disposed = true;
    this.initializationVersion += 1;
    this.output.removeEventListener('webglcontextlost', this.handleContextLost);
    this.output.removeEventListener('webglcontextrestored', this.handleContextRestored);
    if (!this.contextLost) this.deleteResources();
  }

  private initializeResources(): void {
    const gl = this.gl;
    const quad = gl.createBuffer();
    if (!quad) throw new Error('Could not create WebGL fullscreen buffer');
    this.quad = quad;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    this.sceneTexture = this.createTexture();
    this.emissiveTexture = this.createTexture();
    this.pingTexture = this.createTexture();
    this.pongTexture = this.createTexture();
    this.pingFramebuffer = this.createFramebuffer(this.pingTexture);
    this.pongFramebuffer = this.createFramebuffer(this.pongTexture);
  }

  private initializePrograms(): void {
    this.programsReady = false;
    this.initializationError = null;
    const version = ++this.initializationVersion;
    const warmup = shaderWarmupPromise ?? Promise.resolve();
    void warmup
      .then(() => getCachedPrograms(this.gl))
      .then(({ blur, composite }) => {
        if (this.disposed || version !== this.initializationVersion) return;
        this.blurProgram = blur;
        this.compositeProgram = composite;
        this.programsReady = true;
      })
      .catch((error: unknown) => {
        if (this.disposed || version !== this.initializationVersion) return;
        this.initializationError = error instanceof Error ? error : new Error(String(error));
      });
  }

  private allocateTargets(): void {
    this.allocateTexture(this.sceneTexture, this.output.width, this.output.height);
    this.allocateTexture(this.emissiveTexture, this.emissive.width, this.emissive.height);
    this.allocateTexture(this.pingTexture, this.blurWidth, this.blurHeight);
    this.allocateTexture(this.pongTexture, this.blurWidth, this.blurHeight);

    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pingTexture, 0);
    this.assertFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pongFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pongTexture, 0);
    this.assertFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private blur(texture: WebGLTexture, framebuffer: WebGLFramebuffer, stepX: number, stepY: number): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, this.blurWidth, this.blurHeight);
    gl.useProgram(this.blurProgram.program);
    this.bindQuad(this.blurProgram);
    this.bindTexture(texture, 0);
    gl.uniform1i(this.uniform(this.blurProgram.program, 'u_texture'), 0);
    gl.uniform2f(this.uniform(this.blurProgram.program, 'u_step'), stepX, stepY);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private composite(
    shields: readonly ShieldDistortion[],
    split: SplitDistortion | null,
    singularities: readonly SingularityDistortion[],
    time: number,
  ): void {
    const gl = this.gl;
    const program = this.compositeProgram.program;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.output.width, this.output.height);
    gl.useProgram(program);
    this.bindQuad(this.compositeProgram);
    this.bindTexture(this.sceneTexture, 0);
    this.bindTexture(this.emissiveTexture, 1);
    this.bindTexture(this.pongTexture, 2);
    gl.uniform1i(this.uniform(program, 'u_scene'), 0);
    gl.uniform1i(this.uniform(program, 'u_emissive'), 1);
    gl.uniform1i(this.uniform(program, 'u_bloom'), 2);
    gl.uniform2f(this.uniform(program, 'u_resolution'), this.output.width, this.output.height);
    const shieldGeometry = this.shieldGeometry;
    const shieldShape = this.shieldShape;
    const shieldEffect = this.shieldEffect;
    const shieldCount = Math.min(MAX_SHIELD_DISTORTIONS, shields.length);
    for (let index = 0; index < shieldCount; index += 1) {
      const shield = shields[index];
      if (!shield) continue;
      const offset = index * 4;
      shieldGeometry[offset] = shield.centerX;
      shieldGeometry[offset + 1] = shield.centerY;
      shieldGeometry[offset + 2] = shield.radius;
      shieldGeometry[offset + 3] = shield.radiusScale;
      shieldShape[offset] = shield.active ? 1 : 0;
      shieldShape[offset + 1] = shield.sides;
      shieldShape[offset + 2] = shield.rotation;
      shieldShape[offset + 3] = shield.hitStrength;
      shieldEffect[offset] = shield.color[0];
      shieldEffect[offset + 1] = shield.color[1];
      shieldEffect[offset + 2] = shield.color[2];
      shieldEffect[offset + 3] = shield.rippleAge;
    }
    gl.uniform4fv(this.uniform(program, 'u_shieldGeometry[0]'), shieldGeometry);
    gl.uniform4fv(this.uniform(program, 'u_shieldShape[0]'), shieldShape);
    gl.uniform4fv(this.uniform(program, 'u_shieldEffect[0]'), shieldEffect);
    gl.uniform1f(this.uniform(program, 'u_shieldCount'), shieldCount);
    gl.uniform2f(
      this.uniform(program, 'u_splitCenter'),
      split?.centerX ?? 0,
      split?.centerY ?? 0,
    );
    gl.uniform1f(this.uniform(program, 'u_splitRadius'), split?.radius ?? 0);
    gl.uniform1f(this.uniform(program, 'u_splitPhase'), split?.phase ?? 1);
    gl.uniform1f(this.uniform(program, 'u_splitActive'), split ? 1 : 0);
    gl.uniform3f(
      this.uniform(program, 'u_splitColor'),
      split?.color[0] ?? 0.45,
      split?.color[1] ?? 0.91,
      split?.color[2] ?? 0.95,
    );
    const singularityCenters = this.singularityCenters;
    const singularityRadii = this.singularityRadii;
    const singularityStrengths = this.singularityStrengths;
    const singularityCount = Math.min(MAX_SINGULARITY, singularities.length);
    for (let index = 0; index < singularityCount; index += 1) {
      const singularity = singularities[index];
      if (!singularity) continue;
      singularityCenters[index * 2] = singularity.centerX;
      singularityCenters[index * 2 + 1] = singularity.centerY;
      singularityRadii[index] = singularity.radius;
      singularityStrengths[index] = singularity.strength;
    }
    gl.uniform2fv(this.uniform(program, 'u_singularityCenters[0]'), singularityCenters);
    gl.uniform1fv(this.uniform(program, 'u_singularityRadii[0]'), singularityRadii);
    gl.uniform1fv(this.uniform(program, 'u_singularityStrengths[0]'), singularityStrengths);
    gl.uniform1f(this.uniform(program, 'u_singularityCount'), singularityCount);
    gl.uniform1f(this.uniform(program, 'u_time'), time);
    gl.uniform1f(this.uniform(program, 'u_pixelRatio'), this.dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private bindQuad(info: ProgramInfo): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(info.position);
    gl.vertexAttribPointer(info.position, 2, gl.FLOAT, false, 0, 0);
  }

  private bindTexture(texture: WebGLTexture, unit: number): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  private upload(texture: WebGLTexture, source: HTMLCanvasElement): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  private uniform(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    let locations = this.uniformLocations.get(program);
    if (!locations) {
      locations = new Map();
      this.uniformLocations.set(program, locations);
    }
    if (!locations.has(name)) locations.set(name, this.gl.getUniformLocation(program, name));
    return locations.get(name) ?? null;
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Could not create WebGL texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private allocateTexture(texture: WebGLTexture, width: number, height: number): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  private createFramebuffer(texture: WebGLTexture): WebGLFramebuffer {
    const gl = this.gl;
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error('Could not create WebGL framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return framebuffer;
  }

  private assertFramebuffer(): void {
    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) throw new Error(`Incomplete WebGL framebuffer: ${status}`);
  }

  private deleteResources(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.quad);
    gl.deleteTexture(this.sceneTexture);
    gl.deleteTexture(this.emissiveTexture);
    gl.deleteTexture(this.pingTexture);
    gl.deleteTexture(this.pongTexture);
    gl.deleteFramebuffer(this.pingFramebuffer);
    gl.deleteFramebuffer(this.pongFramebuffer);
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.programsReady = false;
    this.initializationVersion += 1;
    PROGRAM_CACHE.delete(this.gl);
  };

  private readonly handleContextRestored = (): void => {
    this.contextLost = false;
    this.initializeResources();
    this.allocateTargets();
    this.initializePrograms();
  };
}
