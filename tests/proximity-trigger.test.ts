import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '@prism-bastion/game-core/game/engine';
import type { Signal, Projectile, ShotBlueprint } from '@prism-bastion/game-core/game/types';
import { addTestProjectile, placeSignalOnPath } from './helpers/combat';

const createStaticProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  distance: number,
): Projectile => {
  const position = engine.path.pointAtDistance(distance).position;
  return addTestProjectile(engine, shot, position, { x: 0, y: 0 }, null, { trailTimer: 0 });
};

const placeSignal = (engine: GameEngine, signal: Signal, distance: number, speed: number): void => {
  placeSignalOnPath(engine, signal, distance, { speed, health: 10_000 });
};

const proximityMineShot = (engine: GameEngine): ShotBlueprint => {
  const carrier = engine.modules.compile([
    'impact-trigger',
    'pulse',
    'proximity-mine',
  ]).shots[0];
  const mine = carrier?.payload[0];
  if (!mine?.static) throw new Error('Expected a proximity mine payload');
  return mine;
};

describe('static proximity detection', () => {
  it('does not retain signals that crossed the sensor before arming', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 31 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 100, 400);
    const projectile = createStaticProjectile(engine, proximityMineShot(engine), 100);

    const steps = Math.ceil((projectile.shot.static?.armTime ?? 0) / FIXED_SIMULATION_STEP) + 1;
    for (let step = 0; step < steps; step += 1) engine.update(FIXED_SIMULATION_STEP);

    expect(projectile.triggerCount).toBe(0);
  });

  it('uses the configured center radius', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 37 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    const compiledShot = proximityMineShot(engine);
    if (!compiledShot.static) throw new Error('Expected static shot configuration');
    const shot: ShotBlueprint = {
      ...compiledShot,
      static: { ...compiledShot.static, armTime: 0 },
    };
    const mineDistance = 100;
    const overlapWithoutCenterEntry = Math.min(signal.radius / 2, shot.static.triggerRadius / 2);
    placeSignal(engine, signal, mineDistance + shot.static.triggerRadius + overlapWithoutCenterEntry, 0);
    const projectile = createStaticProjectile(engine, shot, mineDistance);

    engine.update(FIXED_SIMULATION_STEP);

    expect(signal.radius).toBeGreaterThan(overlapWithoutCenterEntry);
    expect(projectile.triggerCount).toBe(0);
  });

  it('triggers once an armed signal center enters the sensor', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 41 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    const compiledShot = proximityMineShot(engine);
    if (!compiledShot.static) throw new Error('Expected static shot configuration');
    const shot: ShotBlueprint = {
      ...compiledShot,
      static: { ...compiledShot.static, armTime: 0 },
    };
    const mineDistance = 100;
    placeSignal(engine, signal, mineDistance + shot.static.triggerRadius - 1, 0);
    const projectile = createStaticProjectile(engine, shot, mineDistance);

    engine.update(FIXED_SIMULATION_STEP);

    expect(projectile.triggerCount).toBe(1);
  });
});
