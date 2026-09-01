import { clamp, distance, lerpPoint } from './math';
import type { Point } from './types';

/** Returns the first normalized time at which a segment enters a circle. */
export function segmentCircleHitTime(
  start: Point,
  end: Point,
  center: Point,
  radius: number,
): number | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - center.x;
  const fy = start.y - center.y;
  const radiusSquared = radius * radius;
  if (fx * fx + fy * fy <= radiusSquared) return 0;

  const a = dx * dx + dy * dy;
  if (a <= Number.EPSILON) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radiusSquared;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const root = Math.sqrt(discriminant);
  const near = (-b - root) / (2 * a);
  const far = (-b + root) / (2 * a);
  if (near >= 0 && near <= 1) return near;
  if (far >= 0 && far <= 1) return far;
  return null;
}

/**
 * Finds the first contact with a padded regular polygon. The simulation uses
 * short fixed steps; adaptive sampling then brackets the contact and binary
 * search provides a stable impact point without frame-sized tunnelling.
 */
export function segmentRegularPolygonHitTime(
  start: Point,
  end: Point,
  contains: (point: Point) => boolean,
  padding: number,
): number | null {
  if (contains(start)) return 0;
  const segmentLength = distance(start, end);
  if (segmentLength <= Number.EPSILON) return null;
  const sampleSpacing = Math.max(0.75, padding * 0.4);
  const samples = Math.max(2, Math.ceil(segmentLength / sampleSpacing));
  let previousTime = 0;
  for (let index = 1; index <= samples; index += 1) {
    const time = index / samples;
    if (!contains(lerpPoint(start, end, time))) {
      previousTime = time;
      continue;
    }
    let low = previousTime;
    let high = time;
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const midpoint = (low + high) / 2;
      if (contains(lerpPoint(start, end, midpoint))) high = midpoint;
      else low = midpoint;
    }
    return clamp(high, 0, 1);
  }
  return null;
}

/** Returns when a segment leaves a convex region that contains its start. */
export function segmentConvexExitTime(
  start: Point,
  end: Point,
  contains: (point: Point) => boolean,
): number | null {
  if (!contains(start)) return 0;
  if (contains(end)) return null;

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const midpoint = (low + high) / 2;
    if (contains(lerpPoint(start, end, midpoint))) low = midpoint;
    else high = midpoint;
  }
  return clamp(high, 0, 1);
}
