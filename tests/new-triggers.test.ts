import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '@prism-bastion/game-core/game/engine';
import type { Signal, Point, Projectile, ShotBlueprint } from '@prism-bastion/game-core/game/types';
import { createModuleRegistry } from '@prism-bastion/game-core/modules';
import { addTestProjectile, placeSignalOnPath } from './helpers/combat';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  placeSignalOnPath(engine, signal, pathDistance, { speed: 0, health: 10_000 });
};

const addProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  position: Point,
  velocity: Point,
  life = shot.lifetime,
): Projectile => addTestProjectile(engine, shot, position, velocity, null, { life });

const staticPayloads = (engine: GameEngine): Projectile[] => (
  engine.projectiles.filter((projectile) => projectile.behavior === 'static')
);

const updateUntil = (engine: GameEngine, condition: () => boolean, limit = 240): void => {
  for (let step = 0; step < limit && !condition(); step += 1) engine.update(FIXED_SIMULATION_STEP);
};

describe('expiration and terrain trigger modules', () => {
  const registry = createModuleRegistry();

  it('registers both modules as trigger logic', () => {
    expect(registry.require('expiration-trigger').kind).toBe('logic');
    expect(registry.require('terrain-trigger').kind).toBe('logic');
  });

  it('compiles each trigger around one carrier and one payload', () => {
    const expiration = registry.compile(['expiration-trigger', 'pulse', 'proximity-mine']);
    const terrain = registry.compile(['terrain-trigger', 'pulse', 'proximity-mine']);

    expect(expiration.shots[0]?.trigger).toEqual({ type: 'expiration', payloadCount: 1 });
    expect(terrain.shots[0]?.trigger).toEqual({ type: 'terrain', payloadCount: 1, crossingTicks: 1 });
    expect(expiration.energyCost).toBeGreaterThan(0);
    expect(terrain.energyCost).toBeGreaterThan(0);
  });

  it('waits for a piercing carrier final hit before releasing', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 61 });
    for (let index = 0; index < 3; index += 1) engine.spawnCreativeSignal('block');
    const signals = engine.signals.slice(0, 3);
    signals.forEach((signal, index) => placeSignal(engine, signal, 100 + index * 90));
    const shot = engine.modules.compile(['expiration-trigger', 'needle', 'proximity-mine']).shots[0];
    if (!shot) throw new Error('Expected an expiration carrier');
    const projectile = addProjectile(engine, shot, { x: 25, y: 510 }, { x: shot.speed, y: 0 });

    for (let index = 0; index < signals.length; index += 1) {
      const signal = signals[index];
      if (!signal) throw new Error('Expected a placed signal');
      updateUntil(engine, () => signal.hp < signal.maxHp);
      expect(projectile.triggered).toBe(index === signals.length - 1);
      expect(staticPayloads(engine)).toHaveLength(index === signals.length - 1 ? 1 : 0);
    }
  });

  it('releases when a Prism Crown shield fully absorbs the carrier', () => {
    const expirationEngine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 67 });
    expirationEngine.spawnCreativeSignal('crown');
    const crown = expirationEngine.signals[0];
    if (!crown) throw new Error('Expected a Prism Crown');
    placeSignal(expirationEngine, crown, 180);
    const expirationShot = expirationEngine.modules.compile(['expiration-trigger', 'pulse', 'proximity-mine']).shots[0];
    if (!expirationShot) throw new Error('Expected an expiration carrier');
    const expirationProjectile = addProjectile(
      expirationEngine,
      expirationShot,
      { x: crown.position.x - 90, y: crown.position.y },
      { x: expirationShot.speed, y: 0 },
    );

    updateUntil(expirationEngine, () => expirationProjectile.life <= 0);

    expect(crown.hp).toBe(crown.maxHp);
    expect(crown.shield).toBeLessThan(crown.maxShield);
    expect(expirationProjectile.triggered).toBe(true);
    expect(staticPayloads(expirationEngine)).toHaveLength(1);

    const impactEngine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 71 });
    impactEngine.spawnCreativeSignal('crown');
    const impactCrown = impactEngine.signals[0];
    if (!impactCrown) throw new Error('Expected a Prism Crown');
    placeSignal(impactEngine, impactCrown, 180);
    const impactShot = impactEngine.modules.compile(['impact-trigger', 'pulse', 'proximity-mine']).shots[0];
    if (!impactShot) throw new Error('Expected an impact carrier');
    const impactProjectile = addProjectile(
      impactEngine,
      impactShot,
      { x: impactCrown.position.x - 90, y: impactCrown.position.y },
      { x: impactShot.speed, y: 0 },
    );

    updateUntil(impactEngine, () => impactProjectile.life <= 0);

    expect(impactProjectile.triggered).toBe(false);
    expect(staticPayloads(impactEngine)).toHaveLength(0);
  });

  it.each(['timer-trigger', 'terrain-trigger'] as const)(
    'does not release %s on a fully absorbed collision',
    (triggerId) => {
      const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 72 });
      engine.spawnCreativeSignal('crown');
      const crown = engine.signals[0];
      if (!crown) throw new Error('Expected a Prism Crown');
      placeSignal(engine, crown, 180);
      const shot = engine.modules.compile([triggerId, 'pulse', 'proximity-mine']).shots[0];
      if (!shot) throw new Error(`Expected a ${triggerId} carrier`);
      const projectile = addProjectile(
        engine,
        shot,
        { x: crown.position.x - 90, y: crown.position.y },
        { x: shot.speed, y: 0 },
      );

      updateUntil(engine, () => projectile.life <= 0);

      expect(crown.hp).toBe(crown.maxHp);
      expect(projectile.triggered).toBe(false);
      expect(staticPayloads(engine)).toHaveLength(0);
    },
  );

  it('releases at lifetime expiration but not when flying out of bounds', () => {
    const lifetimeEngine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 73 });
    const lifetimeShot = lifetimeEngine.modules.compile(['expiration-trigger', 'pulse', 'proximity-mine']).shots[0];
    if (!lifetimeShot) throw new Error('Expected an expiration carrier');
    const lifetimeProjectile = addProjectile(
      lifetimeEngine,
      lifetimeShot,
      { x: 600, y: 300 },
      { x: lifetimeShot.speed, y: 0 },
      FIXED_SIMULATION_STEP / 2,
    );

    lifetimeEngine.update(FIXED_SIMULATION_STEP);

    expect(lifetimeProjectile.triggered).toBe(true);
    expect(staticPayloads(lifetimeEngine)).toHaveLength(1);

    const boundsEngine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 79 });
    const boundsShot = boundsEngine.modules.compile(['expiration-trigger', 'pulse', 'proximity-mine']).shots[0];
    if (!boundsShot) throw new Error('Expected an expiration carrier');
    const boundsProjectile = addProjectile(
      boundsEngine,
      boundsShot,
      { x: -59, y: 300 },
      { x: -boundsShot.speed, y: 0 },
    );

    boundsEngine.update(FIXED_SIMULATION_STEP);

    expect(boundsProjectile.life).toBe(0);
    expect(boundsProjectile.triggered).toBe(false);
    expect(staticPayloads(boundsEngine)).toHaveLength(0);
  });

  it('releases on the first tick after crossing the channel centerline', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 83 });
    const shot = engine.modules.compile(['terrain-trigger', 'pulse', 'proximity-mine']).shots[0];
    if (!shot) throw new Error('Expected a terrain carrier');
    const centerline = engine.path.pointAtDistance(200).position;
    const projectile = addProjectile(
      engine,
      shot,
      { x: centerline.x, y: centerline.y - 10 },
      { x: 0, y: 1_200 },
    );

    engine.update(FIXED_SIMULATION_STEP);

    expect(projectile.triggered).toBe(false);
    expect(staticPayloads(engine)).toHaveLength(0);

    engine.update(FIXED_SIMULATION_STEP);

    expect(projectile.triggered).toBe(true);
    expect(staticPayloads(engine)).toHaveLength(1);

    engine.update(FIXED_SIMULATION_STEP);
    expect(staticPayloads(engine)).toHaveLength(1);
  });

  it('releases on a collision before completing a centerline crossing', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 89 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a collision target');
    placeSignal(engine, signal, 180);
    const shot = engine.modules.compile(['terrain-trigger', 'pulse', 'proximity-mine']).shots[0];
    if (!shot) throw new Error('Expected a terrain carrier');
    const projectile = addProjectile(
      engine,
      shot,
      { x: signal.position.x, y: signal.position.y - 90 },
      { x: 0, y: shot.speed },
    );

    updateUntil(engine, () => projectile.life <= 0);

    expect(projectile.triggered).toBe(true);
    expect(staticPayloads(engine)).toHaveLength(1);
  });
});
