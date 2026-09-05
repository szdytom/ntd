import { describe, expect, it } from 'vitest';
import { segmentCircleHitTime, segmentConvexExitTime, segmentRegularPolygonHitTime } from '@prism-bastion/game-core/game/collision';
import { isInsideRegularShield } from '@prism-bastion/game-core/signals/capabilities/shield';

describe('swept collision', () => {
  it('detects a circle crossed entirely within one step', () => {
    const time = segmentCircleHitTime(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 0 },
      8,
    );

    expect(time).toBeCloseTo(0.42, 6);
  });

  it('returns the first entry into a padded regular shield', () => {
    const time = segmentRegularPolygonHitTime(
      { x: -100, y: 0 },
      { x: 100, y: 0 },
      (point) => isInsideRegularShield(0, 0, point.x, point.y, 72, 6, 0, 4),
      4,
    );

    expect(time).not.toBeNull();
    expect(time ?? 1).toBeLessThan(0.2);
  });

  it('returns the point where a segment leaves a convex contact region', () => {
    const time = segmentConvexExitTime(
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      (point) => Math.hypot(point.x, point.y) <= 10,
    );

    expect(time).toBeCloseTo(0.5, 2);
  });
});
