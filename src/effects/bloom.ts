const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const BLUR_SHADER = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_step;
varying vec2 v_uv;

void main() {
  vec4 color = texture2D(u_texture, v_uv) * 0.2270270270;
  color += texture2D(u_texture, v_uv + u_step * 1.3846153846) * 0.3162162162;
  color += texture2D(u_texture, v_uv - u_step * 1.3846153846) * 0.3162162162;
  color += texture2D(u_texture, v_uv + u_step * 3.2307692308) * 0.0702702703;
  color += texture2D(u_texture, v_uv - u_step * 3.2307692308) * 0.0702702703;
  gl_FragColor = color;
}
`;

const COMPOSITE_SHADER = `
precision mediump float;

uniform sampler2D u_scene;
uniform sampler2D u_emissive;
uniform sampler2D u_bloom;
uniform vec2 u_resolution;
uniform vec2 u_shieldCenter;
uniform float u_shieldRadius;
uniform float u_shieldScale;
uniform float u_shieldActive;
uniform float u_shieldSides;
uniform float u_shieldRotation;
uniform float u_shieldHit;
uniform vec3 u_shieldColor;
uniform float u_rippleAge;
uniform float u_time;
uniform float u_pixelRatio;
varying vec2 v_uv;

const float TAU = 6.28318530718;

vec3 unpremultiply(vec4 color) {
  return color.rgb / max(color.a, 0.035);
}

float regularPolygonDistance(vec2 delta, float radius) {
  float sides = max(3.0, u_shieldSides);
  float sector = TAU / sides;
  float angle = atan(delta.y, delta.x) - u_shieldRotation;
  float localAngle = mod(angle + sector * 0.5, sector) - sector * 0.5;
  float halfSector = sector * 0.5;
  float boundary = radius * cos(halfSector) / cos(halfSector - abs(localAngle));
  return length(delta) - boundary;
}

float shieldSurfaceMask(vec2 delta, float radius) {
  float signedDistance = regularPolygonDistance(delta, radius);
  float inside = 1.0 - smoothstep(-1.5 * u_pixelRatio, 2.5 * u_pixelRatio, signedDistance);
  float centerFade = smoothstep(radius * 0.08, radius * 0.30, length(delta));
  return inside * centerFade * u_shieldActive;
}

vec2 shieldDistortion(vec2 uv, out float surfaceMask, out float brightStripe) {
  surfaceMask = 0.0;
  brightStripe = 0.0;
  if (u_shieldRadius <= 0.0) return uv;
  vec2 delta = uv * u_resolution - u_shieldCenter;
  float distanceToCenter = length(delta);
  vec2 direction = delta / max(distanceToCenter, 0.001);

  // Mindustry 式的常驻护盾表面：两组交错相位在整个力场内持续折射场景，
  // 而不是等待受击才启动。窄亮纹同步扫过护盾表面，使白底上也清晰可见。
  float fieldRadius = u_shieldRadius * u_shieldScale;
  surfaceMask = shieldSurfaceMask(delta, fieldRadius);
  vec2 flow = vec2(
    sin(delta.y * 0.105 + u_time * 2.60)
      + sin((delta.x + delta.y) * 0.052 - u_time * 1.70) * 0.55,
    sin(delta.x * 0.105 - u_time * 2.30)
      + cos((delta.x - delta.y) * 0.057 + u_time * 1.90) * 0.55
  );
  float surfaceAmplitude = (1.55 + u_shieldHit * 1.75) * u_pixelRatio;
  vec2 surfaceDisplacement = flow * surfaceAmplitude * surfaceMask;
  float stripeWave = 0.5 + 0.5 * sin(
    (delta.x + delta.y) * 0.105
      + sin(delta.x * 0.035) * 2.0
      + u_time * 3.2
  );
  brightStripe = smoothstep(0.74, 1.0, stripeWave) * surfaceMask;

  // 受击波从力场内部越过边界向外扩散，位移在 0.72 秒内衰减。
  float phase = clamp(u_rippleAge / 0.72, 0.0, 1.0);
  float rippleLife = 1.0 - smoothstep(0.0, 1.0, phase);
  float hitDistance = regularPolygonDistance(delta, u_shieldRadius);
  float waveFront = u_shieldRadius * mix(-0.48, 0.46, phase);
  float waveWidth = mix(5.0, 12.0, phase) * u_pixelRatio;
  float waveDelta = (hitDistance - waveFront) / waveWidth;
  float rippleBand = exp(-waveDelta * waveDelta);
  float ripple = rippleBand * cos((hitDistance - waveFront) * 0.52 - phase * 6.0);

  vec2 hitDisplacement = direction * ripple * rippleLife * 6.5 * u_pixelRatio;
  return clamp(
    uv + (surfaceDisplacement + hitDisplacement) / u_resolution,
    vec2(0.001),
    vec2(0.999)
  );
}

void main() {
  float shieldSurface;
  float shieldStripe;
  vec2 sceneUv = shieldDistortion(v_uv, shieldSurface, shieldStripe);
  vec3 scene = texture2D(u_scene, sceneUv).rgb;
  vec4 wideGlow = texture2D(u_bloom, v_uv);
  vec4 hotGlow = texture2D(u_emissive, v_uv);

  // 白底上单纯 additive 会消失，因此宽光晕先进行有上限的色彩侵染。
  vec3 bloomColor = clamp(unpremultiply(wideGlow), 0.0, 1.0);
  float bloomStrength = clamp(wideGlow.a * 0.92, 0.0, 0.34);
  vec3 tintedScene = mix(scene, bloomColor, bloomStrength);

  // 核心仍使用 screen，保留 Mindustry 式的高亮能量中心。
  vec3 hotColor = clamp(unpremultiply(hotGlow), 0.0, 1.0);
  float hotStrength = clamp(hotGlow.a * 0.68, 0.0, 0.72);
  vec3 hot = hotColor * hotStrength;
  vec3 result = 1.0 - (1.0 - tintedScene) * (1.0 - hot);

  // 白底下为持续折射面补一层低强度色彩，并让移动亮纹保持可读性。
  float surfaceTint = shieldSurface * 0.018 + shieldStripe * (0.085 + u_shieldHit * 0.035);
  result = mix(result, u_shieldColor, clamp(surfaceTint, 0.0, 0.14));
  gl_FragColor = vec4(result, 1.0);
}
`;

interface ProgramInfo {
  program: WebGLProgram;
  position: number;
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

export function createBloomWebGLContext(output: HTMLCanvasElement): WebGLRenderingContext | null {
  return output.getContext('webgl', {
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
 * GPU 后处理器。游戏主体仍可使用 Canvas 2D 绘制，但最终场景、模块特效的
 * emissive 层都会作为纹理上传，由 WebGL 完成两次高斯模糊和白底友好的合成。
 */
export class WebGLBloomPipeline {
  private readonly emissive = document.createElement('canvas');
  private readonly emissiveCtx: CanvasRenderingContext2D;
  private gl: WebGLRenderingContext;
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
  private readonly emissiveScale = 0.5;
  private readonly blurScale = 0.25;

  constructor(
    private readonly output: HTMLCanvasElement,
    context?: WebGLRenderingContext,
  ) {
    const emissiveCtx = this.emissive.getContext('2d', { alpha: true });
    if (!emissiveCtx) throw new Error('Emissive Canvas 2D context is unavailable');
    this.emissiveCtx = emissiveCtx;

    const gl = context ?? createBloomWebGLContext(output);
    if (!gl) throw new Error('WebGL is required for the game renderer');
    this.gl = gl;
    this.initialize();

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

  render(scene: HTMLCanvasElement, shield: ShieldDistortion | null = null): void {
    if (this.contextLost) return;
    const gl = this.gl;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    this.upload(this.sceneTexture, scene);
    this.upload(this.emissiveTexture, this.emissive);

    this.blur(this.emissiveTexture, this.pingFramebuffer, 1 / this.blurWidth, 0);
    this.blur(this.pingTexture, this.pongFramebuffer, 0, 1 / this.blurHeight);
    this.composite(shield);
  }

  dispose(): void {
    this.output.removeEventListener('webglcontextlost', this.handleContextLost);
    this.output.removeEventListener('webglcontextrestored', this.handleContextRestored);
    if (!this.contextLost) this.deleteResources();
  }

  private initialize(): void {
    const gl = this.gl;
    this.blurProgram = this.createProgram(BLUR_SHADER);
    this.compositeProgram = this.createProgram(COMPOSITE_SHADER);

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
    gl.uniform1i(gl.getUniformLocation(this.blurProgram.program, 'u_texture'), 0);
    gl.uniform2f(gl.getUniformLocation(this.blurProgram.program, 'u_step'), stepX, stepY);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private composite(shield: ShieldDistortion | null): void {
    const gl = this.gl;
    const program = this.compositeProgram.program;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.output.width, this.output.height);
    gl.useProgram(program);
    this.bindQuad(this.compositeProgram);
    this.bindTexture(this.sceneTexture, 0);
    this.bindTexture(this.emissiveTexture, 1);
    this.bindTexture(this.pongTexture, 2);
    gl.uniform1i(gl.getUniformLocation(program, 'u_scene'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'u_emissive'), 1);
    gl.uniform1i(gl.getUniformLocation(program, 'u_bloom'), 2);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.output.width, this.output.height);
    gl.uniform2f(
      gl.getUniformLocation(program, 'u_shieldCenter'),
      shield?.centerX ?? 0,
      shield?.centerY ?? 0,
    );
    gl.uniform1f(gl.getUniformLocation(program, 'u_shieldRadius'), shield?.radius ?? 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_shieldScale'), shield?.radiusScale ?? 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_shieldActive'), shield?.active ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_shieldSides'), shield?.sides ?? 6);
    gl.uniform1f(gl.getUniformLocation(program, 'u_shieldRotation'), shield?.rotation ?? 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_shieldHit'), shield?.hitStrength ?? 0);
    gl.uniform3f(
      gl.getUniformLocation(program, 'u_shieldColor'),
      shield?.color[0] ?? 0.27,
      shield?.color[1] ?? 0.72,
      shield?.color[2] ?? 1,
    );
    gl.uniform1f(gl.getUniformLocation(program, 'u_rippleAge'), shield?.rippleAge ?? 2);
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), shield?.time ?? 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_pixelRatio'), this.dpr);
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

  private createProgram(fragmentSource: string): ProgramInfo {
    const gl = this.gl;
    const vertex = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Could not create WebGL program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unknown shader link error';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return { program, position: gl.getAttribLocation(program, 'a_position') };
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Could not create WebGL shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
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
    gl.deleteProgram(this.blurProgram.program);
    gl.deleteProgram(this.compositeProgram.program);
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
  };

  private readonly handleContextRestored = (): void => {
    this.contextLost = false;
    this.initialize();
    this.allocateTargets();
  };
}
