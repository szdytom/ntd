import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Enemy, Point, Projectile } from '../src/game/types';

const placeEnemy = (engine: GameEngine, enemy: Enemy, distance: number): void => {
  enemy.speed = 0;
  enemy.distance = distance;
  enemy.position = engine.path.pointAtDistance(distance).position;
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
  it('acquires another enemy when its original target dies', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 19 });
    engine.spawnCreativeEnemy('block');
    engine.spawnCreativeEnemy('block');
    const [original, replacement] = engine.enemies;
    if (!original || !replacement) throw new Error('Expected two enemies');
    placeEnemy(engine, original, 80);
    placeEnemy(engine, replacement, 160);
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
    engine.spawnCreativeEnemy('block');
    const enemy = engine.enemies[0];
    if (!enemy) throw new Error('Expected an enemy');
    placeEnemy(engine, enemy, 120);
    const start = {
      x: enemy.position.x - enemy.radius - 5,
      y: enemy.position.y,
    };
    const projectile = addSeekingNeedle(engine, enemy.id, start, { x: 620, y: 0 });
    const initialHp = enemy.hp;

    for (let step = 0; step < 180 && projectile.life > 0; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    expect(enemy.hp).toBeLessThanOrEqual(initialHp - projectile.damage * 2);
  });
});
