import { describe, expect, it } from 'vitest';
import { getLevel, LEVELS } from '../src/game/config';

describe('level configuration', () => {
  it('provides a two-wave, two-node beginner elbow map', () => {
    const level = getLevel('starter-elbow');
    expect(level.path).toEqual([
      { x: -40, y: 510 }, { x: 420, y: 510 },
      { x: 420, y: 145 }, { x: 1120, y: 145 },
    ]);
    expect(level.towerPads).toHaveLength(2);
    expect(level.waves).toHaveLength(2);
    expect(level.waves.flat()).toHaveLength(14);
    expect(LEVELS).toHaveLength(4);
  });

  it('keeps white-prism pads near the road without overlapping it', () => {
    const level = getLevel('white-prism');
    const distanceToSegment = (
      point: { x: number; y: number },
      start: { x: number; y: number },
      end: { x: number; y: number },
    ): number => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const ratio = Math.max(0, Math.min(1, (
        (point.x - start.x) * dx + (point.y - start.y) * dy
      ) / (dx * dx + dy * dy)));
      return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
    };
    const distances = level.towerPads.map((pad) => Math.min(
      ...level.path.slice(1).map((end, index) => distanceToSegment(pad, level.path[index] ?? end, end)),
    ));

    expect(level.towerPads).toHaveLength(7);
    expect(level.towerPads).toContainEqual({ x: 650, y: 480 });
    expect(distances.every((distance) => distance >= 75 && distance <= 110)).toBe(true);
  });
});
