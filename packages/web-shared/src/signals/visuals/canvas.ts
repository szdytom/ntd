import { signalRegistry, type ShieldCapability, type SignalId } from '@prism-bastion/game-core/signals';
import { ANVIL_SHAPE, FRACTURE_SHAPE, HEXAGRAM_SHAPE, fractureSpikeAngles, regularPolygonPoints, traceFractureSpike, traceSurgeBody } from './geometry';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export interface SignalBodyVisualOptions {
  type: SignalId;
  radius?: number;
  time?: number;
  travelAngle?: number;
  phase?: number;
  hitStrength?: number;
}

export interface SignalShieldVisualState {
  charge: number;
  radiusScale: number;
  hitStrength: number;
}

export function hexToRgb(color: string): readonly [number, number, number] {
  const value = Number.parseInt(color.replace('#', ''), 16);
  if (!Number.isFinite(value)) return [0.27, 0.72, 1];
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
  ];
}

export function traceRegularPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation: number,
): void {
  ctx.beginPath();
  regularPolygonPoints(radius, sides, rotation, x, y).forEach(({ x: px, y: py }, index) => {
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

export function signalVisualRotation(
  type: SignalId,
  time: number,
  travelAngle = 0,
  phase = 0,
): number {
  const visual = signalRegistry.require(type).visual;
  if (visual.spin !== undefined) return time * visual.spin + phase;
  return travelAngle + (visual.rotationOffset ?? 0);
}

export function drawSignalBody(ctx: CanvasRenderingContext2D, options: SignalBodyVisualOptions): void {
  const definition = signalRegistry.require(options.type);
  const visual = definition.visual;
  const radius = options.radius ?? definition.stats.radius;
  const time = options.time ?? 0;
  const travelAngle = options.travelAngle ?? 0;
  const fillColor = (options.hitStrength ?? 0) > 0 ? '#ffffff' : visual.color;

  ctx.save();
  ctx.rotate(signalVisualRotation(options.type, time, travelAngle, options.phase));
  ctx.shadowColor = 'rgba(37, 31, 65, 0.18)';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 4;

  if (visual.geometry === 'fracture') {
    drawFractureBody(ctx, radius, fillColor);
  } else if (visual.geometry === 'anvil') {
    drawAnvilBody(ctx, radius, fillColor);
  } else if (visual.geometry === 'hexagram') {
    drawHexagramBody(ctx, radius, fillColor);
  } else {
    ctx.fillStyle = fillColor;
    if (visual.geometry === 'ring') traceRing(ctx, radius, radius * 0.48);
    else if (visual.geometry === 'surge') traceSurgeBody(ctx, radius);
    else traceRegularPolygon(ctx, 0, 0, radius, visual.sides, 0);
    ctx.fill(visual.geometry === 'ring' ? 'evenodd' : 'nonzero');
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = visual.crownOrbit ? 4 : 3;
    ctx.stroke();
  }
  ctx.shadowColor = 'transparent';

  if (visual.innerOutline) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    traceRegularPolygon(ctx, 0, 0, radius * 0.48, visual.sides, 0);
    ctx.stroke();
  }
  if (visual.crownOrbit) {
    ctx.rotate(-travelAngle - time * 0.9);
    ctx.strokeStyle = '#ffcf4a';
    ctx.lineWidth = 3;
    traceRegularPolygon(ctx, 0, 0, radius + 7, 8, time * 0.9);
    ctx.stroke();
  }
  if (visual.geometry === 'fracture') {
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = Math.max(1.4, radius * 0.075);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8fbff';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2.5, radius * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  if (visual.orbitNodes) {
    for (let index = 0; index < visual.orbitNodes; index += 1) {
      const angle = index * Math.PI * 2 / visual.orbitNodes;
      const orbit = radius * 0.72;
      ctx.fillStyle = '#f4ffc2';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * orbit, Math.sin(angle) * orbit, radius * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHexagramBody(ctx: CanvasRenderingContext2D, radius: number, fillColor: string): void {
  const struck = fillColor === '#ffffff';
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = struck ? '#ffffff' : '#fff3b0';
  ctx.lineWidth = Math.max(2.5, radius * 0.11);
  ctx.lineJoin = 'round';
  for (const rotation of HEXAGRAM_SHAPE.triangleRotations) {
    traceRegularPolygon(ctx, 0, 0, radius, 3, rotation);
    ctx.fill();
    ctx.stroke();
  }
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = struck ? '#ffffff' : '#8f620b';
  ctx.strokeStyle = struck ? '#ffffff' : '#fff8d6';
  ctx.lineWidth = Math.max(2, radius * 0.08);
  traceRegularPolygon(ctx, 0, 0, radius * HEXAGRAM_SHAPE.coreRadiusScale, 6, 0);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = struck ? '#ffffff' : '#fff3b0';
  for (let index = 0; index < 6; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * radius * HEXAGRAM_SHAPE.nodeOrbitScale,
      Math.sin(angle) * radius * HEXAGRAM_SHAPE.nodeOrbitScale,
      Math.max(2, radius * HEXAGRAM_SHAPE.nodeRadiusScale),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function drawAnvilBody(ctx: CanvasRenderingContext2D, radius: number, fillColor: string): void {
  const struck = fillColor === '#ffffff';
  ctx.fillStyle = fillColor;
  traceRegularPolygon(ctx, 0, 0, radius, ANVIL_SHAPE.sides, 0);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = struck ? '#ffffff' : '#5f451c';
  ctx.lineWidth = Math.max(4, radius * 0.15);
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.fillStyle = struck ? '#ffffff' : '#d2a545';
  ctx.strokeStyle = struck ? '#ffffff' : '#f2d27a';
  ctx.lineWidth = Math.max(2.5, radius * 0.085);
  traceRegularPolygon(ctx, 0, 0, radius * ANVIL_SHAPE.plateRadiusScale, ANVIL_SHAPE.sides, 0);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = struck ? 'rgba(255,255,255,0.9)' : '#76551f';
  ctx.lineWidth = Math.max(2, radius * 0.065);
  for (let index = 0; index < ANVIL_SHAPE.sides; index += 1) {
    const angle = index * Math.PI * 2 / ANVIL_SHAPE.sides;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * ANVIL_SHAPE.grooveStartRadiusScale, Math.sin(angle) * radius * ANVIL_SHAPE.grooveStartRadiusScale);
    ctx.lineTo(Math.cos(angle) * radius * ANVIL_SHAPE.grooveEndRadiusScale, Math.sin(angle) * radius * ANVIL_SHAPE.grooveEndRadiusScale);
    ctx.stroke();
  }

  ctx.fillStyle = struck ? '#ffffff' : '#6d4d1c';
  ctx.strokeStyle = struck ? '#ffffff' : '#f6dc91';
  ctx.lineWidth = Math.max(2, radius * 0.06);
  traceRegularPolygon(ctx, 0, 0, radius * ANVIL_SHAPE.coreRadiusScale, ANVIL_SHAPE.sides, Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = struck ? '#ffffff' : '#fff0b2';
  for (let index = 0; index < ANVIL_SHAPE.sides; index += 1) {
    const angle = index * Math.PI * 2 / ANVIL_SHAPE.sides;
    traceRegularPolygon(
      ctx,
      Math.cos(angle) * radius * 0.61,
      Math.sin(angle) * radius * 0.61,
      Math.max(2.5, radius * 0.085),
      4,
      Math.PI / 4,
    );
    ctx.fill();
  }
}

export function drawSignalShield(
  ctx: CanvasRenderingContext2D,
  shield: ShieldCapability,
  state: SignalShieldVisualState,
): void {
  if (state.charge <= 0 || state.radiusScale <= 0) return;
  const radius = shield.radius * state.radiusScale;
  const hit = clamp(state.hitStrength, 0, 1);
  const charge = clamp(state.charge, 0, 1);

  ctx.save();
  ctx.globalAlpha = 0.045 + charge * 0.025 + hit * 0.18;
  ctx.fillStyle = shield.color;
  traceRegularPolygon(ctx, 0, 0, radius, shield.sides, shield.rotation);
  ctx.fill();

  ctx.globalAlpha = 0.38 + charge * 0.14 + hit * 0.4;
  ctx.strokeStyle = shield.color;
  ctx.lineWidth = 1.4 + hit * 3.2;
  traceRegularPolygon(ctx, 0, 0, radius, shield.sides, shield.rotation);
  ctx.stroke();

  if (hit > 0) {
    ctx.globalAlpha = hit * 0.82;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 + hit * 1.7;
    traceRegularPolygon(ctx, 0, 0, radius - 2, shield.sides, shield.rotation);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.22 + hit * 0.72;
  ctx.fillStyle = hit > 0.15 ? '#ffffff' : shield.color;
  for (let index = 0; index < shield.sides; index += 1) {
    const angle = shield.rotation + index * Math.PI * 2 / shield.sides;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.5 + hit * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFractureBody(ctx: CanvasRenderingContext2D, radius: number, fillColor: string): void {
  const coreRadius = radius * FRACTURE_SHAPE.coreRadiusScale;

  ctx.fillStyle = fillColor;
  for (const angle of fractureSpikeAngles()) {
    traceFractureSpike(ctx, radius, angle);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  for (const angle of fractureSpikeAngles()) {
    traceFractureSpike(ctx, radius, angle);
    ctx.stroke();
  }
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function traceRing(ctx: CanvasRenderingContext2D, outerRadius: number, innerRadius: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  ctx.moveTo(innerRadius, 0);
  ctx.arc(0, 0, innerRadius, 0, Math.PI * 2, true);
  ctx.closePath();
}
