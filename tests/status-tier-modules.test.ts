import { describe, expect, it, vi } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Signal, Projectile, ShotBlueprint } from '../src/game/types';
import { createModuleRegistry } from '../src/modules';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  const at = engine.path.pointAtDistance(pathDistance);
  signal.speed = 0;
  signal.distance = pathDistance;
  signal.progress = pathDistance / engine.path.length;
  signal.position = at.position;
  signal.angle = at.angle;
  signal.hp = 10_000;
  signal.maxHp = 10_000;
};

const addProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  position: { x: number; y: number },
  velocity: { x: number; y: number },
  targetId: number | null,
): Projectile => {
  const projectile: Projectile = {
    id: 70_000 + engine.projectiles.length,
    towerId: engine.towers[0]?.id ?? -1,
    position: { ...position },
    velocity: { ...velocity },
    targetId,
    damage: shot.damage,
    speed: shot.speed,
    radius: shot.size,
    color: shot.color,
    life: shot.static?.duration ?? shot.lifetime,
    pierce: shot.pierce,
    slow: shot.slow,
    splash: shot.splash,
    seeking: shot.seeking,
    modules: [...shot.modules],
    shot,
    trailTimer: 1,
    moduleState: {},
    behavior: shot.static ? 'static' : 'linear',
    age: 0,
    triggered: false,
    triggerCooldown: 0,
    triggerCount: 0,
    trail: [],
  };
  engine.projectiles.push(projectile);
  return projectile;
};

const fireAt = (engine: GameEngine, shot: ShotBlueprint, signal: Signal): Projectile => {
  const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
  const launchGap = signal.radius + shot.size + 2;
  return addProjectile(
    engine,
    shot,
    {
      x: signal.position.x - direction.x * launchGap,
      y: signal.position.y - direction.y * launchGap,
    },
    { x: direction.x * shot.speed, y: direction.y * shot.speed },
    signal.id,
  );
};

const advanceUntil = (engine: GameEngine, condition: () => boolean, seconds = 1): void => {
  const steps = Math.ceil(seconds / FIXED_SIMULATION_STEP);
  for (let step = 0; step < steps && !condition(); step += 1) engine.update(FIXED_SIMULATION_STEP);
};

describe('tiered damage status modules', () => {
  const registry = createModuleRegistry();

  it.each([
    ['ember-coating', 'common', 6, 17],
    ['searing-sigil', 'rare', 18, 15],
    ['starfire-matrix', 'legendary', 24, 14],
  ] as const)('compiles %s with its rarity, energy, and direct damage tradeoff', (id, rarity, energy, damage) => {
    const definition = registry.require(id);
    const shot = registry.compile([id, 'pulse']).shots[0];

    expect(definition).toMatchObject({ kind: 'modifier', meta: { rarity, energy } });
    expect(shot).toMatchObject({ damage, energyCost: energy + 15 });
  });

  it('compounds direct damage penalties while retaining all four status modules', () => {
    const shot = registry.compile([
      'ember-coating',
      'toxin',
      'searing-sigil',
      'starfire-matrix',
      'pulse',
    ]).shots[0];

    expect(shot).toMatchObject({ damage: 10, energyCost: 73 });
    expect(shot?.modules).toEqual([
      'ember-coating',
      'toxin',
      'searing-sigil',
      'starfire-matrix',
      'pulse',
    ]);
  });

  it('applies all four independently stackable statuses to one target', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 83 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 200);
    const shot = engine.modules.compile([
      'ember-coating',
      'toxin',
      'searing-sigil',
      'starfire-matrix',
      'pulse',
    ]).shots[0];
    if (!shot) throw new Error('Expected a compiled status shot');
    fireAt(engine, shot, signal);

    advanceUntil(engine, () => signal.statuses.length === 4);

    expect(signal.statuses.map((status) => status.id)).toEqual([
      'ember-coating',
      'toxin',
      'searing-sigil',
      'starfire-matrix',
    ]);
    expect(signal.statuses.map((status) => status.damage)).toEqual([2, 3, 5, 7]);
  });

  it('emits distinct particles while burning statuses remain active', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 85 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 200);
    const shot = engine.modules.compile([
      'ember-coating',
      'searing-sigil',
      'starfire-matrix',
      'pulse',
    ]).shots[0];
    if (!shot) throw new Error('Expected a compiled burning shot');
    fireAt(engine, shot, signal);
    advanceUntil(engine, () => signal.statuses.length === 3);
    const spawnEffect = vi.spyOn(engine.effects, 'spawn');

    advanceUntil(engine, () => false, 0.5);

    const spawnedIds = spawnEffect.mock.calls.map(([id]) => id);
    expect(spawnedIds).toEqual(expect.arrayContaining([
      'module:ember-coating:burning',
      'module:searing-sigil:burning',
      'module:starfire-matrix:burning',
    ]));
    for (const [, options] of spawnEffect.mock.calls.filter(([id]) => id.endsWith(':burning'))) {
      expect(options.data).toEqual({ radius: signal.radius });
    }

    advanceUntil(engine, () => signal.statuses.length === 0, 4);
    spawnEffect.mockClear();
    advanceUntil(engine, () => false, 0.6);
    expect(spawnEffect.mock.calls.some(([id]) => id.endsWith(':burning'))).toBe(false);
  });

  it('delivers the complete legendary burn over eight ticks', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 87 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 200);
    const shot = engine.modules.compile(['starfire-matrix', 'pulse']).shots[0];
    if (!shot) throw new Error('Expected a compiled Starfire shot');
    fireAt(engine, shot, signal);

    advanceUntil(engine, () => signal.statuses.some((status) => status.id === 'starfire-matrix'));
    const hpAfterImpact = signal.hp;
    advanceUntil(engine, () => !signal.statuses.some((status) => status.id === 'starfire-matrix'), 4);

    expect(10_000 - hpAfterImpact).toBe(14);
    expect(hpAfterImpact - signal.hp).toBe(56);
  });
});

describe('Ember Scorch Field', () => {
  it('compiles as a common static trigger payload', () => {
    const registry = createModuleRegistry();
    const definition = registry.require('ember-field');
    const carrier = registry.compile(['impact-trigger', 'pulse', 'ember-field']).shots[0];
    const field = carrier?.payload[0];

    expect(definition).toMatchObject({ kind: 'static', meta: { rarity: 'common', energy: 18 } });
    expect(field).toMatchObject({
      damage: 2,
      lifetime: 4,
      static: {
        duration: 4,
        armTime: 0,
        triggerRadius: 68,
        cooldown: 0.75,
        maxTriggers: 6,
      },
    });
  });

  it('burns targets, refreshes one field status, and publishes the static channel', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 89 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 220);
    const carrier = engine.modules.compile(['impact-trigger', 'pulse', 'frost', 'ember-field']).shots[0];
    const field = carrier?.payload[0];
    if (!field?.static) throw new Error('Expected an Ember Scorch Field payload');
    const projectile = addProjectile(engine, field, { ...signal.position }, { x: 0, y: 0 }, null);

    advanceUntil(engine, () => projectile.triggerCount >= 3, 2);

    expect(signal.slowTime).toBeGreaterThan(0);
    expect(signal.statuses.filter((status) => status.id === 'ember-field')).toHaveLength(1);
    expect(signal.statuses.find((status) => status.id === 'ember-field')).toMatchObject({
      damage: 2,
      duration: 1,
      interval: 0.5,
      particle: {
        effectId: 'module:ember-field:burning',
        interval: 0.44,
      },
    });
  });
});
