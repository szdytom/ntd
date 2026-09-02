import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Signal, Point, Projectile } from '../src/game/types';
import { addTestProjectile, placeSignalOnPath } from './helpers/combat';

const placeSignal = (engine: GameEngine, signal: Signal, distance: number): void => {
  placeSignalOnPath(engine, signal, distance, { speed: 0 });
};

const addSeekingNeedle = (
  engine: GameEngine,
  targetId: number,
  position: Point,
  velocity: Point,
): Projectile => {
  const shot = engine.modules.compile(['seeker', 'needle']).shots[0];
  if (!shot) throw new Error('Expected seeker and needle to compile into a shot');
  return addTestProjectile(engine, shot, position, velocity, targetId, { trailTimer: 0 });
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
