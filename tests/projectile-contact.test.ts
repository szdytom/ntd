import { describe, expect, it, vi } from 'vitest';
import { GAME_EFFECT_IDS } from '../src/effects/game-effects';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import { distance } from '../src/game/math';
import type { Signal } from '../src/game/types';
import { addTestProjectile as addProjectile, placeSignalOnPath } from './helpers/combat';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  placeSignalOnPath(engine, signal, pathDistance, { speed: 0 });
};

describe('piercing projectile contacts', () => {
  it('crosses a signal continuously, damages once per contact, and emits at the exit point', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 109 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    const shot = engine.modules.compile(['needle']).shots[0];
    if (!signal || !shot) throw new Error('Expected a signal and piercing shot');
    placeSignal(engine, signal, 120);

    const collisionRadius = signal.radius + shot.size;
    const start = { x: signal.position.x - collisionRadius - 1, y: signal.position.y };
    const projectile = addProjectile(engine, shot, start, { x: shot.speed, y: 0 }, signal.id);
    const spawnEffect = vi.spyOn(engine.effects, 'spawn');
    const initialHp = signal.hp;

    engine.update(FIXED_SIMULATION_STEP);

    expect(distance(start, projectile.position)).toBeLessThanOrEqual(shot.speed * FIXED_SIMULATION_STEP + 1e-6);
    expect(signal.hp).toBe(initialHp - projectile.damage);

    for (let step = 0; step < 5; step += 1) engine.update(FIXED_SIMULATION_STEP);
    expect(signal.hp).toBe(initialHp - projectile.damage);

    for (let step = 0; step < 20 && projectile.position.x <= signal.position.x + collisionRadius; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    const exitCalls = spawnEffect.mock.calls.filter(([id]) => id === GAME_EFFECT_IDS.projectileExit);
    expect(exitCalls).toHaveLength(1);
    const exitPosition = exitCalls[0]?.[1].position;
    expect(exitPosition?.x).toBeCloseTo(signal.position.x + collisionRadius, 1);
    expect(exitPosition?.y).toBeCloseTo(signal.position.y, 6);

    const trailSteps = projectile.trail.slice(1).map((point, index) => {
      const previous = projectile.trail[index];
      return previous ? distance(previous, point) : 0;
    });
    expect(Math.max(...trailSteps)).toBeLessThanOrEqual(shot.speed * FIXED_SIMULATION_STEP + 1e-6);
  });

  it('does not jump along a ricochet projectile new heading at impact', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 113 });
    engine.spawnCreativeSignal('block');
    engine.spawnCreativeSignal('block');
    const [first, second] = engine.signals;
    const shot = engine.modules.compile(['ricochet', 'razor']).shots[0];
    if (!first || !second || !shot) throw new Error('Expected two signals and a ricochet shot');
    placeSignal(engine, first, 120);
    placeSignal(engine, second, 200);

    const start = {
      x: first.position.x - first.radius - shot.size - 1,
      y: first.position.y,
    };
    const projectile = addProjectile(engine, shot, start, { x: shot.speed, y: 0 }, first.id);

    engine.update(FIXED_SIMULATION_STEP);

    expect(projectile.targetId).toBe(second.id);
    expect(distance(start, projectile.position)).toBeLessThanOrEqual(shot.speed * FIXED_SIMULATION_STEP + 1e-6);
  });
});
