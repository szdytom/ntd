import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Enemy, Projectile, ShotBlueprint } from '../src/game/types';
import { createModuleRegistry } from '../src/modules';

const placeEnemy = (engine: GameEngine, enemy: Enemy, pathDistance: number): void => {
  const at = engine.path.pointAtDistance(pathDistance);
  enemy.speed = 0;
  enemy.distance = pathDistance;
  enemy.progress = pathDistance / engine.path.length;
  enemy.position = at.position;
  enemy.angle = at.angle;
  enemy.hp = 10_000;
  enemy.maxHp = 10_000;
};

const addProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  position: { x: number; y: number },
  velocity: { x: number; y: number },
  targetId: number | null,
): Projectile => {
  const projectile: Projectile = {
    id: 40_000 + engine.projectiles.length,
    towerId: engine.towers[0].id,
    position: { ...position },
    velocity: { ...velocity },
    targetId,
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
    trailTimer: 1,
    moduleState: {},
    behavior: shot.static ? 'static' : 'linear',
    age: 0,
    triggered: false,
    triggerCooldown: 0,
    triggerCount: 0,
    trail: [],
  };
  engine.projectiles.push(projectile);
  return projectile;
};

describe('new module compilation', () => {
  const registry = createModuleRegistry();

  it('registers all four modules', () => {
    expect(['singularity', 'reclaim-circuit', 'focus-core', 'condense-core'].map((id) => registry.require(id).kind))
      .toEqual(['static', 'modifier', 'modifier', 'modifier']);
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
    engine.spawnCreativeEnemy('block');
    const enemy = engine.enemies[0];
    const tower = engine.towers[0];
    if (!enemy || !tower) throw new Error('Expected an enemy and tower');
    placeEnemy(engine, enemy, 120);
    tower.slots.fill(null);
    tower.energy = 0;
    tower.energyRegen = 0;
    const shot = engine.modules.compile(['reclaim-circuit', 'pulse']).shots[0];
    if (!shot) throw new Error('Expected a reclaim pulse');
    const direction = { x: Math.cos(enemy.angle), y: Math.sin(enemy.angle) };
    const launchGap = enemy.radius + shot.size + 1;
    addProjectile(
      engine,
      shot,
      {
        x: enemy.position.x - direction.x * launchGap,
        y: enemy.position.y - direction.y * launchGap,
      },
      { x: direction.x * shot.speed, y: direction.y * shot.speed },
      enemy.id,
    );

    for (let step = 0; step < 30 && tower.energy === 0; step += 1) engine.update(FIXED_SIMULATION_STEP);

    expect(tower.energy).toBeCloseTo(shot.damage * shot.energyRefundMultiplier, 5);
  });

  it('pulls enemies on both sides toward an armed singularity', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 43 });
    engine.spawnCreativeEnemy('block');
    engine.spawnCreativeEnemy('block');
    const [ahead, behind] = engine.enemies;
    const tower = engine.towers[0];
    if (!ahead || !behind || !tower) throw new Error('Expected two enemies and a tower');
    placeEnemy(engine, ahead, 280);
    placeEnemy(engine, behind, 160);
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
