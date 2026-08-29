import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/game/config';
import { FRACTURE_SHAPE, fractureSpikeAngles, fractureSpikePoints } from '../src/game/enemy-shapes';

describe('fracture enemy geometry', () => {
  it('uses a dedicated shape instead of the legacy star', () => {
    expect(ENEMIES.fracture.shape).toBe('fracture');
    expect(FRACTURE_SHAPE.coreRadiusScale).toBeGreaterThan(FRACTURE_SHAPE.spikeBaseRadiusScale);
  });

  it('builds four short cardinal spikes around a dominant circular core', () => {
    const radius = 32;
    const angles = fractureSpikeAngles();
    expect(angles).toHaveLength(4);

    for (const angle of angles) {
      const [tip, firstBase, secondBase] = fractureSpikePoints(radius, angle);
      expect(Math.hypot(tip.x, tip.y)).toBeCloseTo(radius);
      expect(Math.hypot(firstBase.x, firstBase.y)).toBeLessThan(radius * FRACTURE_SHAPE.coreRadiusScale);
      expect(Math.hypot(secondBase.x, secondBase.y)).toBeLessThan(radius * FRACTURE_SHAPE.coreRadiusScale);
    }
  });
});
