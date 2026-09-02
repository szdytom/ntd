import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import { resolveDiamondRiftRadii } from '../src/game/rift-visuals';
import type { Projectile, ShotBlueprint, Signal } from '../src/game/types';
import { addTestProjectile, placeSignalOnPath } from './helpers/combat';

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

const deployBarrier = (engine: GameEngine, signal: Signal): Projectile => {
  const shot = engine.modules.compile(['impact-trigger', 'pulse', 'rift-barrier']).shots[0];
  if (!shot) throw new Error('Expected a barrier carrier');
  const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
  addProjectile(engine, shot, {
    x: signal.position.x - direction.x * 34,
    y: signal.position.y - direction.y * 34,
  }, {
    x: direction.x * shot.speed,
    y: direction.y * shot.speed,
  }, signal.id);

  for (let step = 0; step < 120; step += 1) {
    engine.update(FIXED_SIMULATION_STEP);
    const barrier = engine.projectiles.find((projectile) => projectile.shot.source === 'rift-barrier');
    if (barrier) return barrier;
  }
  throw new Error('Expected a deployed rift barrier');
};

describe('rift barrier', () => {
  it('compiles as an epic passive static payload with 45 base DPS', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 107 });
    const definition = engine.modules.require('rift-barrier');
    const carrier = engine.modules.compile(['impact-trigger', 'pulse', 'rift-barrier']).shots[0];
    const barrier = carrier?.payload[0];

    expect(definition.kind).toBe('static');
    expect(definition.tags).toEqual(expect.arrayContaining(['static', 'area', 'rift-space']));
    expect(definition.meta.rarity).toBe('epic');
    expect(definition.hideProjectile).toBe(true);
    expect(barrier).toMatchObject({
      source: 'rift-barrier',
      damage: 45,
      static: { duration: 5, maxTriggers: 0 },
    });
  });

  it('deploys four independent rifts around a hollow diamond', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 109 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 120);

    const barrier = deployBarrier(engine, signal);

    expect(engine.spaceRifts).toHaveLength(4);
    expect(engine.spaceRifts.every((rift) => rift.source === barrier)).toBe(true);
    expect(engine.spaceRifts.every((rift) => rift.points.length === 2)).toBe(true);
    expect(engine.spaceRifts.every((rift) => rift.damagePerSecond === 45)).toBe(true);
    expect(engine.spaceRifts.every((rift) => rift.settlementInterval === 0.25)).toBe(true);
    expect(engine.spaceRifts.every((rift) => rift.modifierInterval === 0.25)).toBe(true);
    expect(engine.spaceRifts.every((rift) => (
      rift.visual?.type === 'diamond'
      && rift.visual.radius === 72
      && rift.visual.center.x === barrier.position.x
      && rift.visual.center.y === barrier.position.y
    ))).toBe(true);
    const endpoints = engine.spaceRifts.flatMap((rift) => [rift.points[0], rift.points.at(-1)])
      .filter((point) => point !== undefined)
      .map((point) => `${Math.round(point.x - barrier.position.x)},${Math.round(point.y - barrier.position.y)}`);
    expect(new Set(endpoints)).toEqual(new Set(['0,-72', '72,0', '0,72', '-72,0']));
  });

  it('closes the diamond by moving both boundaries toward its center radius', () => {
    const open = resolveDiamondRiftRadii(72, 18, 1);
    const closing = resolveDiamondRiftRadii(72, 18, 0.5);

    expect(open.inner).toBeCloseTo(72 - 18 / Math.SQRT2, 6);
    expect(open.outer).toBeCloseTo(72 + 18 / Math.SQRT2, 6);
    expect(closing.inner).toBeGreaterThan(open.inner);
    expect(closing.outer).toBeLessThan(open.outer);
    expect(resolveDiamondRiftRadii(72, 18, 0)).toEqual({ inner: 72, outer: 72 });
  });

  it('settles only one damage stream where two barrier rifts overlap', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 113 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 120);
    const barrier = deployBarrier(engine, signal);
    const sharedVertex = engine.spaceRifts[0]?.points.at(-1);
    if (!sharedVertex) throw new Error('Expected a shared rift vertex');
    signal.position = { ...sharedVertex };
    signal.hp = 1_000;

    const runtime = engine as unknown as { updateSpaceRifts(delta: number): void };
    for (let step = 0; step < 120; step += 1) runtime.updateSpaceRifts(FIXED_SIMULATION_STEP);

    expect(engine.spaceRifts.filter((rift) => rift.contacts.has(signal.id))).toHaveLength(1);
    expect(signal.hp).toBeCloseTo(1_000 - barrier.damage, 6);
  });
});
