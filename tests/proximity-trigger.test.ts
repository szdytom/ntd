import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Signal, Projectile, ShotBlueprint } from '../src/game/types';

const createStaticProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  distance: number,
): Projectile => {
  const position = engine.path.pointAtDistance(distance).position;
  const projectile: Projectile = {
    id: 30_000 + engine.projectiles.length,
    towerId: engine.towers[0].id,
    position: { ...position },
    velocity: { x: 0, y: 0 },
    targetId: null,
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
    trailTimer: 0,
    moduleState: {},
    behavior: 'static',
    age: 0,
    triggered: false,
    triggerCooldown: 0,
    triggerCount: 0,
    trail: [],
  };
  engine.projectiles.push(projectile);
  return projectile;
};

const placeSignal = (engine: GameEngine, signal: Signal, distance: number, speed: number): void => {
  const at = engine.path.pointAtDistance(distance);
  signal.distance = distance;
  signal.progress = distance / engine.path.length;
  signal.position = at.position;
  signal.angle = at.angle;
  signal.speed = speed;
  signal.hp = 10_000;
  signal.maxHp = 10_000;
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
