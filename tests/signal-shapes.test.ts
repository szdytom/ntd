import { describe, expect, it } from 'vitest';
import { signalRegistry } from '@prism-bastion/game-core/signals';
import { FRACTURE_SHAPE, fractureSpikeAngles, fractureSpikePoints, surgeBodyPoints } from '@prism-bastion/web-shared/signals/visuals/geometry';

describe('fracture signal geometry', () => {
  it('uses a dedicated shape instead of the legacy star', () => {
    expect(signalRegistry.require('fracture').visual.geometry).toBe('fracture');
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

describe('Surge signal geometry', () => {
  it('places the concave face behind its forward-pointing tip', () => {
    const [tip, firstRear, notch, secondRear] = surgeBodyPoints(15);

    expect(tip.x).toBe(15);
    expect(tip.y).toBe(0);
    expect(firstRear.x).toBe(secondRear.x);
    expect(firstRear.x).toBeLessThan(0);
    expect(notch.x).toBeGreaterThan(firstRear.x);
    expect(notch.x).toBeLessThan(0);
    expect(notch.y).toBe(0);
    expect(firstRear.y).toBe(-secondRear.y);
  });
});
