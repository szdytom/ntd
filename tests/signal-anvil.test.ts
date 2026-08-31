import { describe, expect, it } from 'vitest';
import { getSignalCapability, signalRegistry } from '../src/signals';
import { limitSignalContinuousHealthDamage, limitSignalHealthDamage } from '../src/signals/capabilities/damage-cap';
import { signalVisualRotation } from '../src/signals/visuals/canvas';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Signal, Projectile, ShotBlueprint } from '../src/game/types';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  const at = engine.path.pointAtDistance(pathDistance);
  signal.speed = 0;
  signal.distance = pathDistance;
  signal.progress = pathDistance / engine.path.length;
  signal.position = at.position;
  signal.angle = at.angle;
};

const fireAt = (engine: GameEngine, shot: ShotBlueprint, signal: Signal): Projectile => {
  const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
  const launchGap = signal.radius + shot.size + 2;
  const projectile: Projectile = {
    id: 70_000,
    towerId: engine.towers[0]?.id ?? -1,
    position: {
      x: signal.position.x - direction.x * launchGap,
      y: signal.position.y - direction.y * launchGap,
    },
    velocity: { x: direction.x * shot.speed, y: direction.y * shot.speed },
    targetId: signal.id,
    damage: shot.damage,
    speed: shot.speed,
    radius: shot.size,
    color: shot.color,
    life: shot.lifetime,
    pierce: shot.pierce,
    slow: shot.slow,
    splash: shot.splash,
    seeking: shot.seeking,
    modules: [...shot.modules],
    shot,
    trailTimer: 1,
    moduleState: {},
    behavior: 'linear',
    age: 0,
    triggered: false,
    triggerCooldown: 0,
    triggerCount: 0,
    trail: [],
  };
  engine.projectiles.push(projectile);
  return projectile;
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
