import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Signal, Point, Projectile } from '../src/game/types';

const placeSignal = (engine: GameEngine, signal: Signal, distance: number): void => {
  signal.speed = 0;
  signal.distance = distance;
  signal.position = engine.path.pointAtDistance(distance).position;
};

const addSeekingNeedle = (
  engine: GameEngine,
  targetId: number,
  position: Point,
  velocity: Point,
): Projectile => {
  const shot = engine.modules.compile(['seeker', 'needle']).shots[0];
  if (!shot) throw new Error('Expected seeker and needle to compile into a shot');
  const projectile: Projectile = {
    id: 10_000 + engine.projectiles.length,
    towerId: engine.towers[0].id,
    position: { ...position },
    velocity: { ...velocity },
    targetId,
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

describe('seeking projectile retargeting', () => {
  it('acquires another signal when its original target dies', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 19 });
    engine.spawnCreativeSignal('block');
    engine.spawnCreativeSignal('block');
    const [original, replacement] = engine.signals;
    if (!original || !replacement) throw new Error('Expected two signals');
    placeSignal(engine, original, 80);
    placeSignal(engine, replacement, 160);
    original.dead = true;
    const projectile = addSeekingNeedle(
      engine,
      original.id,
      engine.path.pointAtDistance(20).position,
      { x: 0, y: -620 },
    );

    engine.update(FIXED_SIMULATION_STEP);

    expect(projectile.targetId).toBe(replacement.id);
    expect(projectile.velocity.x).toBeGreaterThan(0);
  });

  it('steers a piercing projectile back into the same target while it remains alive', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 23 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, 120);
    const start = {
      x: signal.position.x - signal.radius - 5,
      y: signal.position.y,
    };
    const projectile = addSeekingNeedle(engine, signal.id, start, { x: 620, y: 0 });
    const initialHp = signal.hp;

    for (let step = 0; step < 180 && projectile.life > 0; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    expect(signal.hp).toBeLessThanOrEqual(initialHp - projectile.damage * 2);
  });
});
