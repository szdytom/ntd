import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '@prism-bastion/game-core/game/engine';
import type { ShotBlueprint, Signal } from '@prism-bastion/game-core/game/types';
import {
  getSignalCapability,
  MENDER_OUT_OF_COMBAT_HEAL_DELAY,
  resetSignalFullHealTimer,
  signalRegistry,
  updateSignalFullHeal,
} from '@prism-bastion/game-core/signals';
import { addTestProjectile, placeSignalOnPath } from './helpers/combat';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  placeSignalOnPath(engine, signal, pathDistance, { speed: 0 });
};

const fireAt = (engine: GameEngine, shot: ShotBlueprint, signal: Signal): void => {
  const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
  const launchGap = signal.radius + shot.size + 2;
  addTestProjectile(engine, shot, {
      x: signal.position.x - direction.x * launchGap,
      y: signal.position.y - direction.y * launchGap,
    },
    { x: direction.x * shot.speed, y: direction.y * shot.speed },
    signal.id,
  );
};

describe('Mending Cell reconstruction', () => {
  it('keeps the out-of-combat delay in the signal definition constant', () => {
    const capability = getSignalCapability(signalRegistry.require('mender'), 'full-heal-after-lull');

    expect(MENDER_OUT_OF_COMBAT_HEAL_DELAY).toBe(2.5);
    expect(capability?.delay).toBe(MENDER_OUT_OF_COMBAT_HEAL_DELAY);
  });

  it('restarts the full-heal countdown whenever health damage is taken', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 102 });
    engine.spawnCreativeSignal('mender');
    const signal = engine.signals[0];
    const capability = getSignalCapability(signalRegistry.require('mender'), 'full-heal-after-lull');
    if (!signal || !capability) throw new Error('Expected a Mending Cell');
    signal.hp -= 20;

    resetSignalFullHealTimer(signal, capability, 20);
    expect(updateSignalFullHeal(signal, capability, 2)).toBe(0);
    resetSignalFullHealTimer(signal, capability, 1);
    expect(updateSignalFullHeal(signal, capability, 2)).toBe(0);
    expect(updateSignalFullHeal(signal, capability, 0.5)).toBe(20);
    expect(signal.hp).toBe(signal.maxHp);
  });

  it('returns to full health after 2.5 seconds without further damage in combat', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 103 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a tower');
    tower.slots.fill(null);
    tower.energy = 0;
    tower.energyRegen = 0;
    engine.spawnCreativeSignal('mender');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a Mending Cell');
    placeSignal(engine, signal, 200);
    const shot = engine.modules.compile(['pulse']).shots[0];
    if (!shot) throw new Error('Expected a projectile');
    fireAt(engine, shot, signal);

    for (let step = 0; step < 120 && signal.hp === signal.maxHp; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }
    const damagedHp = signal.hp;
    expect(damagedHp).toBeLessThan(signal.maxHp);

    const delaySteps = Math.round(MENDER_OUT_OF_COMBAT_HEAL_DELAY / FIXED_SIMULATION_STEP);
    for (let step = 1; step < delaySteps; step += 1) engine.update(FIXED_SIMULATION_STEP);
    expect(signal.hp).toBe(damagedHp);

    engine.update(FIXED_SIMULATION_STEP);
    expect(signal.hp).toBe(signal.maxHp);
  });
});
