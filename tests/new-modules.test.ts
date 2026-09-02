import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { EnergyRefundBudget, Signal, Projectile, ShotBlueprint } from '../src/game/types';
import { createModuleRegistry } from '../src/modules';
import { addTestProjectile, placeSignalOnPath } from './helpers/combat';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  placeSignalOnPath(engine, signal, pathDistance, { speed: 0, health: 10_000 });
};

const addProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  position: { x: number; y: number },
  velocity: { x: number; y: number },
  targetId: number | null,
  energyRefundBudget?: EnergyRefundBudget,
): Projectile => addTestProjectile(engine, shot, position, velocity, targetId, {
  ...(energyRefundBudget ? { energyRefundBudget } : {}),
});

describe('new module compilation', () => {
  const registry = createModuleRegistry();

  it('registers the advanced modules', () => {
    expect(['singularity', 'reclaim-circuit', 'focus-core', 'condense-core', 'double-fork'].map((id) => registry.require(id).kind))
      .toEqual(['static', 'logic', 'modifier', 'modifier', 'modifier']);
    expect(registry.require('reclaim-circuit').meta).toMatchObject({ rarity: 'epic', energy: 10 });
    expect(registry.require('fork').meta).toMatchObject({ rarity: 'epic', energy: 34 });
    expect(registry.require('double-fork').meta).toMatchObject({ rarity: 'rare', energy: 18 });
    expect(registry.compile(['double-fork', 'pulse']).shots[0]).toMatchObject({ count: 2 });
  });

  it('converts pierce, forks, and echoes into one focused shot', () => {
    const base = registry.compile(['fork', 'echo', 'needle']).shots[0];
    const shot = registry.compile(['focus-core', 'fork', 'echo', 'needle']).shots[0];

    expect(shot).toMatchObject({
      count: 1,
      spread: 0,
      pierce: 0,
      repeats: 1,
      repeatDelay: 0,
    });
    expect(shot?.damage).toBeGreaterThan(base?.damage ?? 0);
    expect(shot?.speed).toBeGreaterThan(base?.speed ?? 0);
  });

  it('makes focus conversion independent of modifier order', () => {
    const first = registry.compile(['focus-core', 'fork', 'echo', 'needle']).shots[0];
    const last = registry.compile(['fork', 'echo', 'focus-core', 'needle']).shots[0];

    expect(last).toMatchObject({
      damage: first?.damage,
      speed: first?.speed,
      count: first?.count,
      pierce: first?.pierce,
      repeats: first?.repeats,
    });
  });

  it('converts Arcbolt chains into a faster and stronger single-target shot', () => {
    const base = registry.compile(['arcbolt']).shots[0];
    const focused = registry.compile(['focus-core', 'arcbolt']).shots[0];

    expect(base?.chainTargets).toBeGreaterThan(0);
    expect(focused?.chainTargets).toBe(0);
    expect(focused?.damage).toBeGreaterThan(base?.damage ?? 0);
    expect(focused?.speed).toBeGreaterThan(base?.speed ?? 0);
  });

  it('converts the final blast radius into single-target damage', () => {
    const base = registry.compile(['colossus', 'nova']).shots[0];
    const shot = registry.compile(['condense-core', 'colossus', 'nova']).shots[0];

    expect(shot?.splash).toBe(0);
    expect(shot?.damage).toBeGreaterThan(base?.damage ?? 0);
  });

  it('marks reclaim shots with reduced damage and an energy refund', () => {
    const base = registry.compile(['pulse']).shots[0];
    const shot = registry.compile(['reclaim-circuit', 'pulse']).shots[0];

    expect(shot?.damage).toBeLessThan(base?.damage ?? Number.POSITIVE_INFINITY);
    expect(shot?.energyRefundMultiplier).toBeGreaterThan(0);
  });
});

describe('new module combat behavior', () => {
  it('refunds tower energy from actual health damage', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 41 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    const tower = engine.towers[0];
    if (!signal || !tower) throw new Error('Expected a signal and tower');
    placeSignal(engine, signal, 120);
    tower.slots.fill(null);
    tower.energy = 0;
    tower.energyRegen = 0;
    const shot = engine.modules.compile(['reclaim-circuit', 'pulse']).shots[0];
    if (!shot) throw new Error('Expected a reclaim pulse');
    const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
    const launchGap = signal.radius + shot.size + 1;
    addProjectile(
      engine,
      shot,
      {
        x: signal.position.x - direction.x * launchGap,
        y: signal.position.y - direction.y * launchGap,
      },
      { x: direction.x * shot.speed, y: direction.y * shot.speed },
      signal.id,
    );

    for (let step = 0; step < 30 && tower.energy === 0; step += 1) engine.update(FIXED_SIMULATION_STEP);

    expect(tower.energy).toBeCloseTo(shot.damage * shot.energyRefundMultiplier, 5);
  });

  it('stops reclaim refunds when the shared cycle budget is exhausted', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 42 });
    engine.spawnCreativeSignal('block');
    const signal = engine.signals[0];
    const tower = engine.towers[0];
    if (!signal || !tower) throw new Error('Expected a signal and tower');
    placeSignal(engine, signal, 120);
    tower.slots.fill(null);
    tower.energy = 0;
    tower.energyRegen = 0;
    const shot = engine.modules.compile(['reclaim-circuit', 'pulse']).shots[0];
    if (!shot) throw new Error('Expected a reclaim pulse');
    const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
    const launchGap = signal.radius + shot.size + 1;
    const budget = { remaining: 1 };
    addProjectile(
      engine,
      shot,
      {
        x: signal.position.x - direction.x * launchGap,
        y: signal.position.y - direction.y * launchGap,
      },
      { x: direction.x * shot.speed, y: direction.y * shot.speed },
      signal.id,
      budget,
    );

    for (let step = 0; step < 30 && tower.energy === 0; step += 1) engine.update(FIXED_SIMULATION_STEP);

    expect(tower.energy).toBeCloseTo(1, 5);
    expect(budget.remaining).toBe(0);
  });

  it('pulls signals on both sides toward an armed singularity', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 43 });
    engine.spawnCreativeSignal('block');
    engine.spawnCreativeSignal('block');
    const [ahead, behind] = engine.signals;
    const tower = engine.towers[0];
    if (!ahead || !behind || !tower) throw new Error('Expected two signals and a tower');
    placeSignal(engine, ahead, 280);
    placeSignal(engine, behind, 160);
    tower.slots.fill(null);
    const carrier = engine.modules.compile(['impact-trigger', 'pulse', 'singularity']).shots[0];
    const singularity = carrier?.payload[0];
    if (!singularity?.static) throw new Error('Expected a singularity payload');
    addProjectile(
      engine,
      singularity,
      engine.path.pointAtDistance(220).position,
      { x: 0, y: 0 },
      ahead.id,
    );

    const steps = Math.ceil((singularity.static.armTime + 0.12) / FIXED_SIMULATION_STEP);
    for (let step = 0; step < steps; step += 1) engine.update(FIXED_SIMULATION_STEP);

    expect(ahead.distance).toBeLessThan(280);
    expect(ahead.distance).toBeGreaterThanOrEqual(220);
    expect(behind.distance).toBeGreaterThan(160);
    expect(behind.distance).toBeLessThanOrEqual(220);
    expect(ahead.position).toEqual(engine.path.pointAtDistance(ahead.distance).position);
    expect(behind.position).toEqual(engine.path.pointAtDistance(behind.distance).position);
  });
});
