#version 300 es
precision mediump float;

const int MAX_SHIELDS = 16;
const int MAX_SINGULARITIES = 16;
const float TAU = 6.28318530718;

uniform sampler2D u_scene;
uniform sampler2D u_emissive;
uniform sampler2D u_bloom;
uniform sampler2D u_riftMask;
uniform float u_riftSpaceActive;
uniform vec2 u_resolution;
uniform vec4 u_shieldGeometry[MAX_SHIELDS];
uniform vec4 u_shieldShape[MAX_SHIELDS];
uniform vec4 u_shieldEffect[MAX_SHIELDS];
uniform float u_shieldCount;
uniform vec2 u_splitCenter;
uniform float u_splitRadius;
uniform float u_splitPhase;
uniform float u_splitActive;
uniform vec3 u_splitColor;
uniform vec2 u_singularityCenters[MAX_SINGULARITIES];
uniform float u_singularityRadii[MAX_SINGULARITIES];
uniform float u_singularityStrengths[MAX_SINGULARITIES];
uniform float u_singularityCount;
uniform float u_time;
uniform float u_pixelRatio;
in vec2 v_uv;
out vec4 outColor;

vec3 unpremultiply(vec4 color) {
  return color.rgb / max(color.a, 0.035);
}

float regularPolygonDistance(vec2 delta, float radius, float shieldSides, float shieldRotation) {
  float sides = max(3.0, shieldSides);
  float sector = TAU / sides;
  float angle = atan(delta.y, delta.x) - shieldRotation;
  float localAngle = mod(angle + sector * 0.5, sector) - sector * 0.5;
  float halfSector = sector * 0.5;
  float boundary = radius * cos(halfSector) / cos(halfSector - abs(localAngle));
  return length(delta) - boundary;
}

float shieldSurfaceMask(
  vec2 delta,
  float radius,
  float sides,
  float rotation,
  float shieldActive
) {
  float signedDistance = regularPolygonDistance(delta, radius, sides, rotation);
  float inside = 1.0 - smoothstep(-1.5 * u_pixelRatio, 2.5 * u_pixelRatio, signedDistance);
  float centerFade = smoothstep(radius * 0.08, radius * 0.30, length(delta));
  return inside * centerFade * shieldActive;
}

vec2 shieldDistortion(vec2 uv, out vec3 tintColor, out float tintStrength) {
  vec2 warped = uv;
  vec3 tintSum = vec3(0.0);
  tintStrength = 0.0;

  for (int index = 0; index < MAX_SHIELDS; index += 1) {
    if (float(index) >= u_shieldCount) break;
    vec4 geometry = u_shieldGeometry[index];
    vec4 shape = u_shieldShape[index];
    vec4 effect = u_shieldEffect[index];
    float radius = geometry.z;
    if (radius <= 0.0) continue;

    vec2 delta = warped * u_resolution - geometry.xy;
    float distanceToCenter = length(delta);
    vec2 direction = delta / max(distanceToCenter, 0.001);

    // Each active field continuously refracts the scene with two interleaved phases.
    float fieldRadius = radius * geometry.w;
    float surfaceMask = shieldSurfaceMask(delta, fieldRadius, shape.y, shape.z, shape.x);
    vec2 flow = vec2(
      sin(delta.y * 0.105 + u_time * 2.60)
        + sin((delta.x + delta.y) * 0.052 - u_time * 1.70) * 0.55,
      sin(delta.x * 0.105 - u_time * 2.30)
        + cos((delta.x - delta.y) * 0.057 + u_time * 1.90) * 0.55
    );
    float surfaceAmplitude = (1.55 + shape.w * 1.75) * u_pixelRatio;
    vec2 surfaceDisplacement = flow * surfaceAmplitude * surfaceMask;
    float stripeWave = 0.5 + 0.5 * sin(
      (delta.x + delta.y) * 0.105
        + sin(delta.x * 0.035) * 2.0
        + u_time * 3.2
    );
    float brightStripe = smoothstep(0.74, 1.0, stripeWave) * surfaceMask;

    // Impact and restore waves cross their own polygon boundary and fade in 0.72 seconds.
    float phase = clamp(effect.w / 0.72, 0.0, 1.0);
    float rippleLife = 1.0 - smoothstep(0.0, 1.0, phase);
    float hitDistance = regularPolygonDistance(delta, radius, shape.y, shape.z);
    float waveFront = radius * mix(-0.48, 0.46, phase);
    float waveWidth = mix(5.0, 12.0, phase) * u_pixelRatio;
    float waveDelta = (hitDistance - waveFront) / waveWidth;
    float rippleBand = exp(-waveDelta * waveDelta);
    float ripple = rippleBand * cos((hitDistance - waveFront) * 0.52 - phase * 6.0);
    vec2 hitDisplacement = direction * ripple * rippleLife * 6.5 * u_pixelRatio;

    warped = clamp(
      warped + (surfaceDisplacement + hitDisplacement) / u_resolution,
      vec2(0.001),
      vec2(0.999)
    );
    float localTint = surfaceMask * 0.018 + brightStripe * (0.085 + shape.w * 0.035);
    tintSum += effect.rgb * localTint;
    tintStrength += localTint;
  }

  tintColor = tintStrength > 0.0 ? tintSum / tintStrength : vec3(0.0);
  return warped;
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

vec2 singularityDistortion(vec2 uv, out float horizonMask, out float lensMask) {
  horizonMask = 0.0;
  lensMask = 0.0;
  vec2 warped = uv;
  for (int index = 0; index < MAX_SINGULARITIES; index++) {
    if (float(index) >= u_singularityCount) break;
    vec2 center = u_singularityCenters[index];
    float radius = max(u_singularityRadii[index], 1.0);
    float strength = u_singularityStrengths[index];
    vec2 delta = warped * u_resolution - center;
    float distanceToCenter = length(delta);
    vec2 direction = delta / max(distanceToCenter, 0.001);
    vec2 tangent = vec2(-direction.y, direction.x);
    float normalizedDistance = distanceToCenter / radius;
    float field = (1.0 - smoothstep(0.12, 1.0, normalizedDistance)) * strength;
    float lens = exp(-pow((normalizedDistance - 0.42) * 5.2, 2.0)) * strength;
    float inwardRefraction = lens * (7.5 + field * 3.5) * u_pixelRatio;
    float swirl = field * sin(normalizedDistance * 18.0 - u_time * 3.2) * 2.4 * u_pixelRatio;
    warped = clamp(
      warped - (direction * inwardRefraction + tangent * swirl) / u_resolution,
      vec2(0.001),
      vec2(0.999)
    );
    horizonMask = max(
      horizonMask,
      (1.0 - smoothstep(0.05, 0.24, normalizedDistance)) * strength
    );
    lensMask = max(lensMask, lens);
  }
  return warped;
}

void main() {
  vec3 shieldTintColor;
  float shieldTintStrength;
  vec2 sceneUv = shieldDistortion(v_uv, shieldTintColor, shieldTintStrength);
  float splitBlur;
  sceneUv = splitRippleDistortion(sceneUv, splitBlur);
  float singularityHorizon;
  float singularityLens;
  sceneUv = singularityDistortion(sceneUv, singularityHorizon, singularityLens);
  vec3 scene = texture(u_scene, sceneUv).rgb;
  if (u_splitActive > 0.5 && splitBlur > 0.001) {
    vec2 delta = sceneUv * u_resolution - u_splitCenter;
    vec2 tangent = normalize(vec2(-delta.y, delta.x) + vec2(0.001));
    vec2 blurStep = tangent * (1.5 + splitBlur * 4.5) * u_pixelRatio / u_resolution;
    vec3 softened = (
      texture(u_scene, clamp(sceneUv - blurStep, vec2(0.001), vec2(0.999))).rgb
      + scene
      + texture(u_scene, clamp(sceneUv + blurStep, vec2(0.001), vec2(0.999))).rgb
    ) / 3.0;
    scene = mix(scene, softened, clamp(splitBlur * 0.78, 0.0, 0.78));
  }
  if (singularityLens > 0.001) {
    vec2 pixel = 1.25 * u_pixelRatio / u_resolution;
    vec3 refracted = scene;
    refracted.r = texture(u_scene, clamp(sceneUv - pixel, vec2(0.001), vec2(0.999))).r;
    refracted.b = texture(u_scene, clamp(sceneUv + pixel, vec2(0.001), vec2(0.999))).b;
    scene = mix(scene, refracted, clamp(singularityLens * 0.52, 0.0, 0.52));
  }
  if (u_riftSpaceActive > 0.5) {
    float riftMask = texture(u_riftMask, v_uv).a;
    if (riftMask > 0.002) {
      vec3 voidColor = vec3(0.027, 0.020, 0.047);
      float foreground = smoothstep(0.035, 0.120, length(scene - voidColor));
      float reveal = riftMask * (1.0 - foreground);
      vec2 riftPixel = v_uv * u_resolution / max(u_pixelRatio, 1.0);
      float flow = riftPixel.y
        + sin(riftPixel.x * 0.032 - u_time * 1.75) * 2.4
        + sin(riftPixel.x * 0.071 + u_time * 0.90) * 0.85;
      float lane = abs(mod(flow + u_time * 4.8, 13.0) - 6.5);
      float filament = 1.0 - smoothstep(0.30, 1.15, lane);
      float dash = smoothstep(
        0.08,
        0.72,
        0.5 + 0.5 * sin(riftPixel.x * 0.083 - u_time * 2.10 + flow * 0.018)
      );
      float broadPulse = 0.5 + 0.5 * sin(
        riftPixel.x * 0.025 + riftPixel.y * 0.016 - u_time * 1.25
      );
      vec3 riftColor = mix(
        vec3(0.075, 0.010, 0.145),
        vec3(0.430, 0.065, 0.730),
        0.18 + broadPulse * 0.45
      );
      riftColor += vec3(0.64, 0.16, 0.92) * filament * (0.28 + dash * 0.38);
      riftColor += vec3(1.00, 0.82, 1.00) * filament * dash * dash * 0.42;
      scene = mix(scene, riftColor, reveal);
    }
  }
  vec4 wideGlow = texture(u_bloom, v_uv);
  vec4 hotGlow = texture(u_emissive, v_uv);

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
  result = mix(result, shieldTintColor, clamp(shieldTintStrength, 0.0, 0.14));
  result = mix(result, u_splitColor, clamp(splitBlur * 0.075, 0.0, 0.075));
  result = mix(result, vec3(0.027, 0.012, 0.065), clamp(singularityHorizon * 0.92, 0.0, 0.92));
  result = mix(result, vec3(0.435, 0.290, 0.847), clamp(singularityLens * 0.10, 0.0, 0.10));
  outColor = vec4(result, 1.0);
}
