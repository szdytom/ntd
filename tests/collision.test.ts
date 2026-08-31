import { describe, expect, it } from 'vitest';
import { segmentCircleHitTime, segmentRegularPolygonHitTime } from '../src/game/collision';
import { isInsideRegularShield } from '../src/signals/capabilities/shield';

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
});
