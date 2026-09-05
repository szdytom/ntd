import { describe, expect, it } from 'vitest';
import { getSignalCapability, signalRegistry } from '@prism-bastion/game-core/signals';
import { limitSignalContinuousHealthDamage, limitSignalHealthDamage } from '@prism-bastion/game-core/signals/capabilities/damage-cap';
import { signalVisualRotation } from '@prism-bastion/web-shared/signals/visuals/canvas';
import { FIXED_SIMULATION_STEP, GameEngine } from '@prism-bastion/game-core/game/engine';
import type { Signal, Projectile, ShotBlueprint } from '@prism-bastion/game-core/game/types';
import { addTestProjectile, placeSignalOnPath } from './helpers/combat';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  placeSignalOnPath(engine, signal, pathDistance, { speed: 0 });
};

const fireAt = (engine: GameEngine, shot: ShotBlueprint, signal: Signal): Projectile => {
  const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
  const launchGap = signal.radius + shot.size + 2;
  return addTestProjectile(engine, shot, {
      x: signal.position.x - direction.x * launchGap,
      y: signal.position.y - direction.y * launchGap,
    },
    { x: direction.x * shot.speed, y: direction.y * shot.speed },
    signal.id,
  );
};

describe('Prism Anvil layered armor elite', () => {
  it('caps only health damage above its configured threshold', () => {
    const armor = getSignalCapability(signalRegistry.require('anvil'), 'damage-cap');
    if (!armor) throw new Error('Expected damage-cap capability');
    const cap = armor.damageCap;

    expect(cap).toBeGreaterThan(0);
    expect(limitSignalHealthDamage(cap / 2, armor)).toBe(cap / 2);
    expect(limitSignalHealthDamage(cap, armor)).toBe(cap);
    expect(limitSignalHealthDamage(cap * 10, armor)).toBe(cap);
    const continuousCap = armor.continuousDamageCapPerSecond;
    expect(limitSignalContinuousHealthDamage(continuousCap * 10, 0.5, armor)).toBe(continuousCap * 0.5);
    expect(limitSignalContinuousHealthDamage(continuousCap * 10, 1, armor)).toBe(continuousCap);
  });

  it('rotates slowly independent of its travel direction', () => {
    const first = signalVisualRotation('anvil', 2, 1.7, 0.3);
    const otherDirection = signalVisualRotation('anvil', 2, -0.8, 0.3);
    const later = signalVisualRotation('anvil', 3, 1.7, 0.3);

    expect(otherDirection).toBe(first);
    expect(later).toBeGreaterThan(first);
  });

  it('applies the cap in the shared combat damage path', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 101 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a tower');
    tower.slots.fill(null);
    tower.energy = 0;
    tower.energyRegen = 0;
    engine.spawnCreativeSignal('anvil');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a Prism Anvil');
    placeSignal(engine, signal, 200);
    const shot = engine.modules.compile(['overdrive', 'colossus', 'pulse']).shots[0];
    const cap = getSignalCapability(signalRegistry.require('anvil'), 'damage-cap')!.damageCap;
    if (!shot || shot.damage <= cap) throw new Error('Expected a projectile above the armor cap');
    fireAt(engine, shot, signal);

    for (let step = 0; step < 120 && signal.hp === signal.maxHp; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    expect(signal.hp).toBe(signal.maxHp - cap);
  });
});
