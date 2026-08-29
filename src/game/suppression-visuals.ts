import type { EnemyAuraConfig } from './config';
import { seededNoise } from './math';
import type { Point } from './types';
import { traceRegularPolygon } from './enemy-visuals';

export function drawSuppressionSource(
  ctx: CanvasRenderingContext2D,
  position: Point,
  radius: number,
  aura: EnemyAuraConfig,
  time: number,
  sourceId: number,
  emissive: boolean,
): void {
  const pulse = 0.62 + Math.sin(time * 5 + sourceId) * 0.18;
  ctx.save();
  ctx.globalAlpha = pulse * (emissive ? 0.72 : 0.26);
  ctx.fillStyle = aura.color;
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius + (emissive ? 5 : 13), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSuppressionLink(
  ctx: CanvasRenderingContext2D,
  source: Point,
  target: Point,
  aura: EnemyAuraConfig,
  time: number,
  sourceId: number,
  towerId: number,
  emissive: boolean,
): void {
  const points = createLightningPoints(source, target, sourceId, towerId, Math.floor(time * 22));
  if (emissive) {
    strokeLightning(ctx, points, aura.lightningColor, 5, 0.86);
    strokeLightning(ctx, points, aura.lightningCoreColor, 1.5, 0.96);
  } else {
    strokeLightning(ctx, points, aura.lightningColor, 7, 0.2);
    strokeLightning(ctx, points, aura.lightningColor, 2.8, 0.94);
    strokeLightning(ctx, points, aura.lightningCoreColor, 1, 1);
  }
  drawSuppressionCollapse(ctx, target, towerId, time, emissive);
}

function drawSuppressionCollapse(
  ctx: CanvasRenderingContext2D,
  position: Point,
  towerId: number,
  time: number,
  emissive: boolean,
): void {
  const phase = (time * 0.72 + towerId * 0.071) % 1;
  const radius = 8 + (1 - phase * phase * phase) * 70;
  const alpha = phase * (emissive ? 0.82 : 0.76);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ff5c5c';
  ctx.lineWidth = emissive ? 5 : 0.4 + phase * 4.6;
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  if (!emissive) {
    ctx.globalAlpha = alpha * 0.78;
    ctx.strokeStyle = '#fff2f2';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  for (let index = 0; index < 10; index += 1) {
    const angle = index * Math.PI * 2 / 10 + (seededNoise(towerId * 101 + index) - 0.5) * 0.24;
    const travel = 15 + (1 - phase * phase) * (35 + seededNoise(towerId * 211 + index * 13) * 35);
    const length = 15 * phase;
    const x = position.x + Math.cos(angle) * travel;
    const y = position.y + Math.sin(angle) * travel;
    ctx.globalAlpha = phase * (emissive ? 0.76 : 0.82);
    ctx.strokeStyle = index % 2 === 0 ? '#ffffff' : '#ff5c5c';
    ctx.lineWidth = emissive ? 3 : 0.5 + phase * 1.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  if (!emissive) {
    for (let index = 0; index < 6; index += 1) {
      const seed = towerId * 307 + index * 53;
      const shapePhase = (time * 0.58 + seededNoise(seed)) % 1;
      const fade = Math.sin(shapePhase * Math.PI);
      const startRadius = 82 + seededNoise(seed + 7) * 34;
      const travelRadius = 18 + (1 - shapePhase * shapePhase) * (startRadius - 18);
      const baseAngle = seededNoise(seed + 13) * Math.PI * 2;
      const curve = (seededNoise(seed + 19) - 0.5) * 0.8 * Math.sin(shapePhase * Math.PI);
      const angle = baseAngle + curve;
      const size = 6 + seededNoise(seed + 23) * 2;
      const sides = seededNoise(seed + 29) < 0.5 ? 3 : 4;
      const rotationDirection = seededNoise(seed + 31) < 0.5 ? -1 : 1;
      const rotation = seededNoise(seed + 37) * Math.PI * 2
        + time * rotationDirection * (0.65 + seededNoise(seed + 41) * 0.55);
      ctx.globalAlpha = fade * 0.64;
      ctx.strokeStyle = '#292534';
      ctx.lineWidth = 1.25;
      traceRegularPolygon(
        ctx,
        position.x + Math.cos(angle) * travelRadius,
        position.y + Math.sin(angle) * travelRadius,
        size,
        sides,
        rotation,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

function createLightningPoints(
  from: Point,
  to: Point,
  sourceId: number,
  towerId: number,
  flickerFrame: number,
): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const segments = Math.max(4, Math.min(9, Math.ceil(length / 42)));
  const points: Point[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const envelope = Math.sin(progress * Math.PI);
    const seed = sourceId * 997 + towerId * 67 + flickerFrame * 13 + index * 31;
    const offset = (seededNoise(seed) - 0.5) * (22 + length * 0.035) * envelope;
    points.push({
      x: from.x + dx * progress + normalX * offset,
      y: from.y + dy * progress + normalY * offset,
    });
  }
  return points;
}

function strokeLightning(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  color: string,
  width: number,
  alpha: number,
): void {
  const first = points[0];
  if (!first) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point) ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();
}
