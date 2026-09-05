import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '@prism-bastion/game-core/game/engine';
import {
  getSignalCapability,
  signalRegistry,
  updateSignalHealthRegeneration,
} from '@prism-bastion/game-core/signals';
import { HEXAGRAM_SHAPE, regularPolygonPoints } from '@prism-bastion/web-shared/signals/visuals/geometry';

describe('Solar Sigil regeneration elite', () => {
  it('moves smoothly at Kite base speed with the requested combat profile', () => {
    const solar = signalRegistry.require('solar');
    const kite = signalRegistry.require('kite');

    expect(solar.stats.speed).toBe(kite.stats.speed);
    expect(getSignalCapability(solar, 'pulse-movement')).toBeUndefined();
    expect(getSignalCapability(solar, 'health-regeneration')).toBeDefined();
  });

  it('returns any surviving health state to full in one fixed simulation frame', () => {
    const solar = signalRegistry.require('solar');
    const capability = getSignalCapability(solar, 'health-regeneration');
    if (!capability) throw new Error('Expected health regeneration');
    const signal = { hp: 1, maxHp: solar.stats.health, dead: false };

    updateSignalHealthRegeneration(signal, capability, FIXED_SIMULATION_STEP);
    expect(signal.hp).toBe(signal.maxHp);
  });

  it('applies regeneration through the shared enemy update path', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'rose-circuit', seed: 104 });
    engine.spawnCreativeSignal('solar');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a Solar Sigil');
    signal.speed = 0;
    signal.hp = Math.max(Number.EPSILON, signal.maxHp - 1);

    engine.update(FIXED_SIMULATION_STEP);

    expect(signal.hp).toBe(signal.maxHp);
  });

  it('builds its hexagram from two opposed triangles', () => {
    const radius = signalRegistry.require('solar').stats.radius;

    expect(HEXAGRAM_SHAPE.triangleRotations).toHaveLength(2);
    expect(Math.abs(HEXAGRAM_SHAPE.triangleRotations[1] - HEXAGRAM_SHAPE.triangleRotations[0])).toBe(Math.PI);
    for (const rotation of HEXAGRAM_SHAPE.triangleRotations) {
      expect(regularPolygonPoints(radius, 3, rotation)).toHaveLength(3);
    }
  });
});
