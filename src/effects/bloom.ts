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
uniform vec2 u_splitCenter;
uniform float u_splitRadius;
uniform float u_splitPhase;
uniform float u_splitActive;
uniform vec3 u_splitColor;
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

  // Mindustry-style persistent shield surface: two interleaved phases continuously
  // refract the scene across the field. Narrow highlights keep it visible on white.
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

  // The impact wave crosses the field boundary and fades over 0.72 seconds.
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

vec2 splitRippleDistortion(vec2 uv, out float blurMask) {
  blurMask = 0.0;
  if (u_splitActive < 0.5 || u_splitRadius <= 0.0) return uv;
  vec2 delta = uv * u_resolution - u_splitCenter;
  float distanceToCenter = length(delta);
  vec2 direction = delta / max(distanceToCenter, 0.001);
  float phase = clamp(u_splitPhase, 0.0, 1.0);
  float eased = 1.0 - pow(1.0 - phase, 3.0);
  float waveFront = mix(8.0 * u_pixelRatio, u_splitRadius, eased);
  float waveWidth = mix(7.0, 16.0, phase) * u_pixelRatio;
  float waveDelta = (distanceToCenter - waveFront) / waveWidth;
  float waveBand = exp(-waveDelta * waveDelta);
  float interior = (1.0 - smoothstep(max(0.0, waveFront - 24.0 * u_pixelRatio), waveFront + 5.0 * u_pixelRatio, distanceToCenter))
    * sin(phase * 3.14159265);
  blurMask = max(waveBand, interior * 0.48);
  float ripple = waveBand * sin(waveDelta * 4.2 - phase * 9.0);
  vec2 displacement = direction * ripple * mix(11.0, 2.0, phase) * u_pixelRatio;
  return clamp(uv + displacement / u_resolution, vec2(0.001), vec2(0.999));
}

void main() {
  float shieldSurface;
  float shieldStripe;
  vec2 sceneUv = shieldDistortion(v_uv, shieldSurface, shieldStripe);
  float splitBlur;
  sceneUv = splitRippleDistortion(sceneUv, splitBlur);
  vec3 scene = texture2D(u_scene, sceneUv).rgb;
  if (u_splitActive > 0.5 && splitBlur > 0.001) {
    vec2 delta = sceneUv * u_resolution - u_splitCenter;
    vec2 tangent = normalize(vec2(-delta.y, delta.x) + vec2(0.001));
    vec2 blurStep = tangent * (1.5 + splitBlur * 4.5) * u_pixelRatio / u_resolution;
    vec3 softened = (
      texture2D(u_scene, clamp(sceneUv - blurStep, vec2(0.001), vec2(0.999))).rgb
      + scene
      + texture2D(u_scene, clamp(sceneUv + blurStep, vec2(0.001), vec2(0.999))).rgb
    ) / 3.0;
    scene = mix(scene, softened, clamp(splitBlur * 0.78, 0.0, 0.78));
  }
  vec4 wideGlow = texture2D(u_bloom, v_uv);
  vec4 hotGlow = texture2D(u_emissive, v_uv);

  // Pure additive light vanishes on white, so the broad halo uses bounded tinting first.
  vec3 bloomColor = clamp(unpremultiply(wideGlow), 0.0, 1.0);
  float bloomStrength = clamp(wideGlow.a * 0.92, 0.0, 0.34);
  vec3 tintedScene = mix(scene, bloomColor, bloomStrength);

  // The core still uses screen blending to preserve its bright energy center.
  vec3 hotColor = clamp(unpremultiply(hotGlow), 0.0, 1.0);
  float hotStrength = clamp(hotGlow.a * 0.68, 0.0, 0.72);
  vec3 hot = hotColor * hotStrength;
  vec3 result = 1.0 - (1.0 - tintedScene) * (1.0 - hot);

  // A low-intensity tint keeps the refractive surface and moving highlights legible on white.
  float surfaceTint = shieldSurface * 0.018 + shieldStripe * (0.085 + u_shieldHit * 0.035);
  result = mix(result, u_shieldColor, clamp(surfaceTint, 0.0, 0.14));
  result = mix(result, u_splitColor, clamp(splitBlur * 0.075, 0.0, 0.075));
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

export interface SplitDistortion {
  centerX: number;
  centerY: number;
  radius: number;
  phase: number;
  color: readonly [number, number, number];
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
 * GPU postprocessor. The game can remain on Canvas 2D, while the final scene and
 * emissive effect layer are uploaded as textures for two-pass blur and compositing.
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
  private readonly uniformLocations = new WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
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

  render(
    scene: HTMLCanvasElement,
    shield: ShieldDistortion | null = null,
    split: SplitDistortion | null = null,
  ): void {
    if (this.contextLost) return;
    const gl = this.gl;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    this.upload(this.sceneTexture, scene);
    this.upload(this.emissiveTexture, this.emissive);

    this.blur(this.emissiveTexture, this.pingFramebuffer, 1 / this.blurWidth, 0);
    this.blur(this.pingTexture, this.pongFramebuffer, 0, 1 / this.blurHeight);
    this.composite(shield, split);
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
    gl.uniform1i(this.uniform(this.blurProgram.program, 'u_texture'), 0);
    gl.uniform2f(this.uniform(this.blurProgram.program, 'u_step'), stepX, stepY);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private composite(shield: ShieldDistortion | null, split: SplitDistortion | null): void {
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
    gl.uniform2f(
      this.uniform(program, 'u_shieldCenter'),
      shield?.centerX ?? 0,
      shield?.centerY ?? 0,
    );
    gl.uniform1f(this.uniform(program, 'u_shieldRadius'), shield?.radius ?? 0);
    gl.uniform1f(this.uniform(program, 'u_shieldScale'), shield?.radiusScale ?? 0);
    gl.uniform1f(this.uniform(program, 'u_shieldActive'), shield?.active ? 1 : 0);
    gl.uniform1f(this.uniform(program, 'u_shieldSides'), shield?.sides ?? 6);
    gl.uniform1f(this.uniform(program, 'u_shieldRotation'), shield?.rotation ?? 0);
    gl.uniform1f(this.uniform(program, 'u_shieldHit'), shield?.hitStrength ?? 0);
    gl.uniform3f(
      this.uniform(program, 'u_shieldColor'),
      shield?.color[0] ?? 0.27,
      shield?.color[1] ?? 0.72,
      shield?.color[2] ?? 1,
    );
    gl.uniform1f(this.uniform(program, 'u_rippleAge'), shield?.rippleAge ?? 2);
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
    gl.uniform1f(this.uniform(program, 'u_time'), shield?.time ?? 0);
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

  private uniform(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    let locations = this.uniformLocations.get(program);
    if (!locations) {
      locations = new Map();
      this.uniformLocations.set(program, locations);
    }
    if (!locations.has(name)) locations.set(name, this.gl.getUniformLocation(program, name));
    return locations.get(name) ?? null;
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
