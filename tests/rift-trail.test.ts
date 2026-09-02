import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import { WORLD } from '../src/game/config';
import { getSignalCapability, signalRegistry } from '../src/signals';
import type { Signal, Projectile, ShotBlueprint } from '../src/game/types';
import { createModuleRegistry } from '../src/modules';
import { addTestProjectile, advanceEngineFor as advance, placeSignalOnPath } from './helpers/combat';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  placeSignalOnPath(engine, signal, pathDistance, { speed: 0, health: 1_000 });
};

const addProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  position: { x: number; y: number },
  velocity: { x: number; y: number },
  targetId: number,
): Projectile => addTestProjectile(engine, shot, position, velocity, targetId, { trailTimer: 0 });

describe('void beam compatibility', () => {
  const registry = createModuleRegistry();

  it('declares module-owned tags and fixed collisionless shot semantics', () => {
    expect(registry.require('seeker').tags).toContain('route');
    expect(registry.require('void-beam').tags).toContain('fixed-route');
    expect(registry.hasTag('rift-trail', 'rift-space')).toBe(true);
    expect(registry.hasTag('void-beam', 'rift-space')).toBe(false);
    expect(registry.compile(['void-beam']).shots[0]).toMatchObject({
      damage: 28,
      speed: 170,
      collision: 'none',
      trajectory: 'fixed',
      aim: 'direct',
      boundary: 'world',
    });
    expect(registry.compile(['void-beam']).diagnostics).toEqual([]);
  });

  it('uses its authored high energy cost, projectile ratio, and widened contact band', () => {
    const rift = registry.require('rift-trail');

    expect(rift.meta.energy).toBe(82);
    expect(rift.meta.text?.detail).toMatchObject({ damage: 2.5, width: 18 });
  });

  it.each(['seeker', 'ricochet'])('warns that the %s route module is ineffective', (moduleId) => {
    const program = registry.compile([moduleId, 'void-beam']);

    expect(program.diagnostics).toContainEqual(expect.objectContaining({
      code: 'ineffective-combination',
      severity: 'warning',
      moduleId,
      relatedModuleId: 'void-beam',
    }));
  });

  it('does not warn for a steerable projectile', () => {
    expect(registry.compile(['seeker', 'pulse']).diagnostics).toEqual([]);
  });
});

describe('rift trail combat', () => {
  it('lets the carrier pass through a signal without direct damage', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 73 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 120);
    const shot = engine.modules.compile(['void-beam']).shots[0];
    if (!shot) throw new Error('Expected a void beam');
    const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
    addProjectile(engine, shot, {
      x: signal.position.x - direction.x * 34,
      y: signal.position.y - direction.y * 34,
    }, {
      x: direction.x * shot.speed,
      y: direction.y * shot.speed,
    }, signal.id);

    advance(engine, 0.5);

    expect(signal.hp).toBe(1_000);
    expect(engine.projectiles).toHaveLength(1);
  });

  it('deals stable damage per second while a signal remains in contact', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 79 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 120);
    const shot = engine.modules.compile(['rift-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a riftwake void beam');
    const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
    addProjectile(engine, shot, {
      x: signal.position.x - direction.x * 34,
      y: signal.position.y - direction.y * 34,
    }, {
      x: direction.x * shot.speed,
      y: direction.y * shot.speed,
    }, signal.id);

    for (let step = 0; step < 120 && !engine.spaceRifts[0]?.contacts.has(signal.id); step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    const rift = engine.spaceRifts[0];
    expect(rift?.contacts.has(signal.id)).toBe(true);
    if (!rift) throw new Error('Expected a persistent rift');
    expect(rift.settlementInterval).toBeGreaterThan(FIXED_SIMULATION_STEP);
    expect(rift.modifierInterval).toBeGreaterThanOrEqual(rift.settlementInterval);
    expect(rift.effectInterval).toBeGreaterThanOrEqual(rift.settlementInterval);
    expect(rift.contacts.get(signal.id)?.pendingDamage).toBeCloseTo(
      rift.damagePerSecond * FIXED_SIMULATION_STEP,
      6,
    );
    expect(signal.hp).toBe(1_000);

    advance(engine, 1);
    const hpAfterOneSecond = signal.hp;
    advance(engine, 0.5);

    expect(engine.spaceRifts).toHaveLength(1);
    expect(engine.spaceRifts[0]?.points.length).toBeGreaterThan(2);
    expect(hpAfterOneSecond).toBeCloseTo(1_000 - rift.damagePerSecond, 6);
    expect(signal.hp).toBeCloseTo(1_000 - rift.damagePerSecond * 1.5, 6);
  });

  it('derives its DPS from the compiled projectile damage', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 80 });
    const shot = engine.modules.compile(['overdrive', 'rift-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected an overdriven riftwake void beam');
    addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 }, 1);

    engine.update(FIXED_SIMULATION_STEP);

    const authoredMultiplier = engine.modules.require('rift-trail').meta.text?.detail?.damage;
    if (typeof authoredMultiplier !== 'number') throw new Error('Expected authored rift multiplier');
    expect(shot.damage).toBe(42);
    expect(engine.spaceRifts[0]?.damagePerSecond).toBe(shot.damage * authoredMultiplier);
  });

  it('uses only the strongest rift when several rifts cover one signal', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 91 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 120);
    const weakShot = engine.modules.compile(['rift-trail', 'void-beam']).shots[0];
    const strongShot = engine.modules.compile(['overdrive', 'rift-trail', 'void-beam']).shots[0];
    if (!weakShot || !strongShot) throw new Error('Expected two riftwake void beams');
    const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
    const position = {
      x: signal.position.x - direction.x * 34,
      y: signal.position.y - direction.y * 34,
    };
    addProjectile(engine, weakShot, position, {
      x: direction.x * weakShot.speed,
      y: direction.y * weakShot.speed,
    }, signal.id);
    addProjectile(engine, strongShot, position, {
      x: direction.x * strongShot.speed,
      y: direction.y * strongShot.speed,
    }, signal.id);

    for (let step = 0; step < 120 && !engine.spaceRifts.some((rift) => rift.contacts.has(signal.id)); step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    expect(engine.spaceRifts).toHaveLength(2);
    expect(engine.spaceRifts.filter((rift) => rift.contacts.has(signal.id))).toHaveLength(1);
    const strongestDps = Math.max(...engine.spaceRifts.map((rift) => rift.damagePerSecond));
    advance(engine, 1);

    expect(signal.hp).toBeCloseTo(1_000 - strongestDps, 6);
  });

  it('uses an explicit per-second armor cap independent of settlement frequency', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 82 });
    engine.spawnCreativeSignal('anvil');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a Prism Anvil');
    placeSignal(engine, signal, 120);
    const shot = engine.modules.compile(['rift-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a riftwake void beam');
    const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
    addProjectile(engine, shot, {
      x: signal.position.x - direction.x * 34,
      y: signal.position.y - direction.y * 34,
    }, {
      x: direction.x * shot.speed,
      y: direction.y * shot.speed,
    }, signal.id);

    for (let step = 0; step < 120 && !engine.spaceRifts[0]?.contacts.has(signal.id); step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }
    advance(engine, 1);

    expect(signal.hp).toBeCloseTo(
      1_000 - getSignalCapability(signalRegistry.require('anvil'), 'damage-cap')!.continuousDamageCapPerSecond,
      6,
    );
  });

  it('applies target modifiers on each sustained damage pulse', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 81 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 120);
    const shot = engine.modules.compile(['frost', 'rift-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a frosted riftwake void beam');
    const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
    addProjectile(engine, shot, {
      x: signal.position.x - direction.x * 34,
      y: signal.position.y - direction.y * 34,
    }, {
      x: direction.x * shot.speed,
      y: direction.y * shot.speed,
    }, signal.id);

    for (let step = 0; step < 180 && signal.slowFactor === 0; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    expect(signal.hp).toBeLessThan(1_000);
    expect(signal.slowFactor).toBe(0.3);
    expect(signal.slowTime).toBeGreaterThan(1.5);
  });

  it('finishes the carrier at the boundary while leaving the rift nearby', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 83 });
    const shot = engine.modules.compile(['rift-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a riftwake void beam');
    addProjectile(engine, shot, { x: WORLD.width - 1, y: WORLD.height / 2 }, { x: shot.speed, y: 0 }, 1);

    engine.update(FIXED_SIMULATION_STEP);

    expect(engine.projectiles).toHaveLength(0);
    const end = engine.spaceRifts[0]?.points.at(-1);
    if (!end) throw new Error('Expected a rift endpoint');
    expect(Math.hypot(end.x - WORLD.width, end.y - WORLD.height / 2)).toBeLessThan(6.5);
  });

  it('starts its retention timer only after the carrier expires', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 89 });
    const shot = engine.modules.compile(['rift-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a riftwake void beam');
    const projectile = addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 }, 1);

    advance(engine, 0.6);
    expect(engine.spaceRifts[0]?.remaining).toBe(2.5);
    advance(engine, 0.8);
    expect(engine.spaceRifts[0]?.remaining).toBe(2.5);

    projectile.life = 0;
    advance(engine, 2.4);
    expect(engine.spaceRifts).toHaveLength(1);
    advance(engine, 0.2);
    expect(engine.spaceRifts).toHaveLength(0);
  });
});
