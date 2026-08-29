import { lerpPoint } from './math';
import type { Point } from './types';

export interface PathSampler {
  readonly length: number;
  pointAtDistance(distance: number): { position: Point; angle: number };
  nearestDistance(point: Point): number;
}

export function createPathSampler(path: readonly Point[]): PathSampler {
  if (path.length < 2) throw new Error('A level path requires at least two points');
  const segments: Array<{ start: Point; end: Point; length: number }> = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const point = path[index];
    const end = path[index + 1];
    if (!point || !end) continue;
    const segmentLength = Math.hypot(end.x - point.x, end.y - point.y);
    if (segmentLength <= Number.EPSILON) continue;
    segments.push({
      start: point,
      end,
      length: segmentLength,
    });
  }
  if (segments.length === 0) throw new Error('A level path requires at least one non-zero segment');
  const length = segments.reduce((sum, segment) => sum + segment.length, 0);
  return {
    length,
    pointAtDistance(distance) {
      let remaining = Math.max(0, distance);
      for (const segment of segments) {
        if (remaining <= segment.length) {
          return {
            position: lerpPoint(segment.start, segment.end, remaining / segment.length),
            angle: Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x),
          };
        }
        remaining -= segment.length;
      }
      const last = segments[segments.length - 1];
      if (!last) throw new Error('Path sampler has no segments');
      return {
        position: { ...last.end },
        angle: Math.atan2(last.end.y - last.start.y, last.end.x - last.start.x),
      };
    },
    nearestDistance(point) {
      let bestDistanceSquared = Number.POSITIVE_INFINITY;
      let bestPathDistance = 0;
      let traversed = 0;
      for (const segment of segments) {
        const dx = segment.end.x - segment.start.x;
        const dy = segment.end.y - segment.start.y;
        const lengthSquared = segment.length * segment.length;
        const projection = Math.max(0, Math.min(1,
          ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared,
        ));
        const nearestX = segment.start.x + dx * projection;
        const nearestY = segment.start.y + dy * projection;
        const distanceSquared = (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2;
        if (distanceSquared < bestDistanceSquared) {
          bestDistanceSquared = distanceSquared;
          bestPathDistance = traversed + segment.length * projection;
        }
        traversed += segment.length;
      }
      return bestPathDistance;
    },
  };
}
