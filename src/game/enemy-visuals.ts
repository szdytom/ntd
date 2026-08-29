import { ENEMIES, type EnemyShieldConfig } from './config';
import { FRACTURE_SHAPE, fractureSpikeAngles, traceFractureSpike } from './enemy-shapes';
import { clamp } from './math';
import type { EnemyType } from './types';

export interface EnemyBodyVisualOptions {
  type: EnemyType;
  radius?: number;
  time?: number;
  travelAngle?: number;
  phase?: number;
  hitStrength?: number;
}

export interface EnemyShieldVisualState {
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
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * Math.PI * 2 / sides;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function enemyVisualRotation(
  type: EnemyType,
  time: number,
  travelAngle = 0,
  phase = 0,
): number {
  if (type === 'fracture') return time * 0.55 + phase;
  if (type === 'radiant') return -time * 0.38 + phase;
  return travelAngle + (type === 'kite' ? Math.PI / 4 : 0);
}

export function drawEnemyBody(ctx: CanvasRenderingContext2D, options: EnemyBodyVisualOptions): void {
  const config = ENEMIES[options.type];
  const radius = options.radius ?? config.radius;
  const time = options.time ?? 0;
  const travelAngle = options.travelAngle ?? 0;
  const fillColor = (options.hitStrength ?? 0) > 0 ? '#ffffff' : config.color;

  ctx.save();
  ctx.rotate(enemyVisualRotation(options.type, time, travelAngle, options.phase));
  ctx.shadowColor = 'rgba(37, 31, 65, 0.18)';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 4;

  if (config.shape === 'fracture') {
    drawFractureBody(ctx, radius, fillColor);
  } else {
    ctx.fillStyle = fillColor;
    if (config.shape === 'ring') traceRing(ctx, radius, radius * 0.48);
    else traceRegularPolygon(ctx, 0, 0, radius, config.sides, options.type === 'spark' ? Math.PI / 2 : 0);
    ctx.fill(config.shape === 'ring' ? 'evenodd' : 'nonzero');
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = options.type === 'crown' ? 4 : 3;
    ctx.stroke();
  }
  ctx.shadowColor = 'transparent';

  if (options.type === 'hex' || options.type === 'crown') {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    traceRegularPolygon(ctx, 0, 0, radius * 0.48, config.sides, 0);
    ctx.stroke();
  }
  if (options.type === 'crown') {
    ctx.rotate(-travelAngle - time * 0.9);
    ctx.strokeStyle = '#ffcf4a';
    ctx.lineWidth = 3;
    traceRegularPolygon(ctx, 0, 0, radius + 7, 8, time * 0.9);
    ctx.stroke();
  }
  if (config.shape === 'fracture') {
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
  if (options.type === 'radiant') {
    for (let index = 0; index < 3; index += 1) {
      const angle = index * Math.PI * 2 / 3;
      const orbit = radius * 0.72;
      ctx.fillStyle = '#f4ffc2';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * orbit, Math.sin(angle) * orbit, radius * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawEnemyShield(
  ctx: CanvasRenderingContext2D,
  shield: EnemyShieldConfig,
  state: EnemyShieldVisualState,
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
