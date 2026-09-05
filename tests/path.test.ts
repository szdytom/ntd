import { describe, expect, it } from 'vitest';
import { createPathSampler } from '@prism-bastion/game-core/game/path';

describe('path sampler', () => {
  it('interpolates across segments and clamps past the end', () => {
    const path = createPathSampler([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 40 },
    ]);

    expect(path.length).toBe(70);
    expect(path.pointAtDistance(15)).toEqual({ position: { x: 15, y: 0 }, angle: 0 });
    expect(path.pointAtDistance(50)).toEqual({ position: { x: 30, y: 20 }, angle: Math.PI / 2 });
    expect(path.pointAtDistance(100).position).toEqual({ x: 30, y: 40 });
    const reused = { x: -1, y: -1 };
    expect(path.sampleInto(50, reused)).toBe(Math.PI / 2);
    expect(reused).toEqual({ x: 30, y: 20 });
  });

  it('projects points onto the nearest path segment', () => {
    const path = createPathSampler([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 40 },
    ]);

    expect(path.nearestDistance({ x: 12, y: 8 })).toBe(12);
    expect(path.nearestDistance({ x: 36, y: 25 })).toBe(55);
  });

  it('rejects paths without a segment', () => {
    expect(() => createPathSampler([{ x: 0, y: 0 }])).toThrow('at least two points');
  });
});
