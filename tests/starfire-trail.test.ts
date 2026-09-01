import { describe, expect, it, vi } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Projectile, ShotBlueprint, Signal } from '../src/game/types';
import { createModuleRegistry } from '../src/modules';

const addProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  position: { x: number; y: number },
  velocity: { x: number; y: number },
): Projectile => {
  const projectile: Projectile = {
    id: 90_000 + engine.projectiles.length,
    towerId: engine.towers[0]?.id ?? -1,
    position: { ...position },
    velocity: { ...velocity },
    targetId: null,
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
    trailTimer: 0,
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

const advance = (engine: GameEngine, seconds: number): void => {
  const steps = Math.ceil(seconds / FIXED_SIMULATION_STEP);
  for (let step = 0; step < steps; step += 1) engine.update(FIXED_SIMULATION_STEP);
};

const spawnSignalAt = (engine: GameEngine, position: { x: number; y: number }): Signal => {
  engine.spawnCreativeSignal('spark');
  const signal = engine.signals.at(-1);
  if (!signal) throw new Error('Expected a signal');
  signal.speed = 0;
  signal.position = { ...position };
  signal.hp = 1_000;
  signal.maxHp = 1_000;
  return signal;
};

describe('Starfire Wake', () => {
  const registry = createModuleRegistry();

  it('registers at the authored epic status-trail tier', () => {
    const definition = registry.require('starfire-trail');
    const shot = registry.compile(['starfire-trail', 'void-beam']).shots[0];

    expect(definition).toMatchObject({
      kind: 'trail',
      tags: expect.arrayContaining(['trail', 'area', 'status']),
      meta: {
        rarity: 'epic',
        energy: 48,
        text: { detail: { damage: 45, width: 44, duration: 2, burnDamage: 5, burnTicks: 5 } },
      },
    });
    expect(shot).toMatchObject({ damage: 28, energyCost: 69 });
  });

  it('creates a persistent effects-only plasma band with shared Starfire particles', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 157 });
    const shot = engine.modules.compile(['starfire-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a Starfire Wake void beam');
    const spawnEffect = vi.spyOn(engine.effects, 'spawn');
    addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 });

    advance(engine, 0.3);

    expect(engine.spaceRifts).toHaveLength(1);
    expect(engine.spaceRifts[0]).toMatchObject({
      width: 44,
      damagePerSecond: 12.6,
      pointLifetime: 2,
      coverageGroup: 'starfire-trail',
      visual: { type: 'effects-only' },
      contactStatus: {
        id: 'starfire-trail',
        duration: 2,
        interval: 0.4,
        damage: 5,
        particle: { effectId: 'module:starfire-trail:burning', interval: 0.32 },
      },
    });
    const effectIds = spawnEffect.mock.calls.map(([id]) => id);
    expect(effectIds).toEqual(expect.arrayContaining([
      'module:starfire-trail:plasma',
      'module:starfire-trail:starfall',
    ]));
  });

  it('keeps Cinderwake and Starfire Wake as independent damage and status families', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 163 });
    const shot = engine.modules.compile(['cinder-trail', 'starfire-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a combined fire-trail void beam');
    addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 });
    advance(engine, 0.2);
    const signal = spawnSignalAt(engine, { x: 120, y: 100 });

    const runtime = engine as unknown as { updateSpaceRifts(delta: number): void };
    for (let step = 0; step < 30; step += 1) runtime.updateSpaceRifts(FIXED_SIMULATION_STEP);

    expect(engine.spaceRifts.filter((trail) => trail.contacts.has(signal.id))).toHaveLength(2);
    expect(1_000 - signal.hp).toBeCloseTo((7 + 12.6) * 0.25, 6);
    expect(signal.statuses.map((status) => status.id)).toEqual(expect.arrayContaining([
      'cinder-trail',
      'starfire-trail',
    ]));
  });

  it('scales one shared plasma band when the module is stacked', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 167 });
    const shot = engine.modules.compile(['starfire-trail', 'starfire-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a stacked Starfire Wake void beam');
    addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 });

    engine.update(FIXED_SIMULATION_STEP);

    expect(engine.spaceRifts).toHaveLength(1);
    expect(engine.spaceRifts[0]).toMatchObject({
      damagePerSecond: 25.2,
      contactStatus: { damage: 10 },
    });
  });
});
