import { describe, expect, it, vi } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '@prism-bastion/game-core/game/engine';
import type { Projectile, ShotBlueprint, Signal } from '@prism-bastion/game-core/game/types';
import { createModuleRegistry } from '@prism-bastion/game-core/modules';
import { addTestProjectile, advanceEngineFor as advance } from './helpers/combat';

const addProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  position: { x: number; y: number },
  velocity: { x: number; y: number },
  targetId: number | null,
): Projectile => addTestProjectile(engine, shot, position, velocity, targetId, { trailTimer: 0 });

const spawnStationarySignal = (engine: GameEngine): Signal => {
  engine.spawnCreativeSignal('spark');
  const signal = engine.signals.at(-1);
  if (!signal) throw new Error('Expected a signal');
  signal.speed = 0;
  signal.hp = 1_000;
  signal.maxHp = 1_000;
  return signal;
};

describe('Cinderwake', () => {
  const registry = createModuleRegistry();

  it('registers as an uncommon status trail at its authored power tier', () => {
    const definition = registry.require('cinder-trail');
    const shot = registry.compile(['cinder-trail', 'void-beam']).shots[0];

    expect(definition).toMatchObject({
      kind: 'trail',
      tags: expect.arrayContaining(['trail', 'area', 'status']),
      meta: {
        rarity: 'uncommon',
        energy: 28,
        text: { detail: { damage: 25, width: 32, duration: 1.5, burnDamage: 3, burnTicks: 3 } },
      },
    });
    expect(shot).toMatchObject({ damage: 28, energyCost: 49 });
  });

  it('builds an effects-only continuous band and emits visual fire independently', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 127 });
    const shot = engine.modules.compile(['cinder-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a Cinderwake void beam');
    const spawnEffect = vi.spyOn(engine.visuals, 'spawn');
    addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 }, null);

    advance(engine, 0.2);

    const trail = engine.spaceRifts[0];
    expect(trail).toMatchObject({
      width: 32,
      damagePerSecond: 7,
      pointLifetime: 1.5,
      coverageGroup: 'cinder-trail',
      visual: { type: 'effects-only' },
      contactStatus: {
        id: 'cinder-trail',
        duration: 1.5,
        interval: 0.5,
        damage: 3,
      },
    });
    expect(trail?.points.length).toBeGreaterThan(2);
    expect(spawnEffect.mock.calls.some(([id]) => id === 'module:cinder-trail:embers')).toBe(true);
  });

  it('uses the band geometry rather than individual particles for contact', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 131 });
    const inside = spawnStationarySignal(engine);
    const outside = spawnStationarySignal(engine);
    const shot = engine.modules.compile(['cinder-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a Cinderwake void beam');
    addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 }, null);
    advance(engine, 0.2);
    inside.position = { x: 120, y: 118 };
    outside.position = { x: 120, y: 130 };

    const runtime = engine as unknown as { updateSpaceRifts(delta: number): void };
    runtime.updateSpaceRifts(FIXED_SIMULATION_STEP);

    expect(inside.statuses).toContainEqual(expect.objectContaining({ id: 'cinder-trail', damage: 3 }));
    expect(outside.statuses.some((status) => status.id === 'cinder-trail')).toBe(false);
  });

  it('damages contacts and keeps refreshing one burning status', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 137 });
    const signal = spawnStationarySignal(engine);
    const at = engine.path.pointAtDistance(120);
    signal.distance = 120;
    signal.progress = 120 / engine.path.length;
    signal.position = at.position;
    signal.angle = at.angle;
    const shot = engine.modules.compile(['cinder-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a Cinderwake void beam');
    const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
    addProjectile(engine, shot, {
      x: signal.position.x - direction.x * 34,
      y: signal.position.y - direction.y * 34,
    }, {
      x: direction.x * shot.speed,
      y: direction.y * shot.speed,
    }, signal.id);

    for (let step = 0; step < 120 && !signal.statuses.some((status) => status.id === 'cinder-trail'); step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }
    const burning = signal.statuses.find((status) => status.id === 'cinder-trail');
    expect(burning).toMatchObject({
      duration: 1.5,
      interval: 0.5,
      damage: 3,
      particle: { effectId: 'module:cinder-trail:burning', interval: 0.4 },
    });

    advance(engine, 0.75);

    expect(signal.hp).toBeLessThan(1_000);
    expect(signal.statuses.filter((status) => status.id === 'cinder-trail')).toHaveLength(1);
    expect(signal.statuses.find((status) => status.id === 'cinder-trail')?.remaining).toBeGreaterThan(1.3);
  });

  it('expires old path sections while the carrier remains active', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 139 });
    const shot = engine.modules.compile(['cinder-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a Cinderwake void beam');
    const projectile = addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 }, null);

    advance(engine, 2);

    const trail = engine.spaceRifts[0];
    expect(projectile.life).toBeGreaterThan(0);
    expect(trail?.points.length).toBeGreaterThan(2);
    expect(trail?.points.length).toBeLessThan(28);
    expect(trail?.points.every((point) => point.age < 1.5)).toBe(true);
    expect(trail?.points[0]?.x).toBeGreaterThan(100);
  });

  it('scales one shared band when the module is stacked', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 149 });
    const shot = engine.modules.compile(['cinder-trail', 'cinder-trail', 'void-beam']).shots[0];
    if (!shot) throw new Error('Expected a stacked Cinderwake void beam');
    addProjectile(engine, shot, { x: 100, y: 100 }, { x: shot.speed, y: 0 }, null);

    engine.update(FIXED_SIMULATION_STEP);

    expect(engine.spaceRifts).toHaveLength(1);
    expect(engine.spaceRifts[0]).toMatchObject({
      damagePerSecond: 14,
      contactStatus: { damage: 6 },
    });
  });

  it('uses only the strongest wake when independent projectiles overlap', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 151 });
    const weakShot = engine.modules.compile(['cinder-trail', 'void-beam']).shots[0];
    const strongShot = engine.modules.compile(['overdrive', 'cinder-trail', 'void-beam']).shots[0];
    if (!weakShot || !strongShot) throw new Error('Expected two Cinderwake void beams');
    addProjectile(engine, weakShot, { x: 100, y: 100 }, { x: weakShot.speed, y: 0 }, null);
    addProjectile(engine, strongShot, { x: 100, y: 100 }, { x: strongShot.speed, y: 0 }, null);
    advance(engine, 0.4);
    const signal = spawnStationarySignal(engine);
    signal.position = { x: 140, y: 100 };

    const runtime = engine as unknown as { updateSpaceRifts(delta: number): void };
    for (let step = 0; step < 120; step += 1) runtime.updateSpaceRifts(FIXED_SIMULATION_STEP);

    const contacts = engine.spaceRifts.filter((trail) => trail.contacts.has(signal.id));
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.damagePerSecond).toBe(10.5);
    expect(1_000 - signal.hp).toBeCloseTo(10.5, 6);
    expect(signal.statuses.filter((status) => status.id === 'cinder-trail')).toHaveLength(1);
  });
});
