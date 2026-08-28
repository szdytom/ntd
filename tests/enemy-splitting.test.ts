import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, FRACTURE_SPLIT_DELAY, GameEngine } from '../src/game/engine';
import type { Enemy, Projectile } from '../src/game/types';

function placeEnemy(engine: GameEngine, enemy: Enemy, pathDistance: number): void {
  const at = engine.path.pointAtDistance(pathDistance);
  enemy.distance = pathDistance;
  enemy.progress = pathDistance / engine.path.length;
  enemy.position = at.position;
  enemy.angle = at.angle;
}

function addLethalProjectile(engine: GameEngine, enemy: Enemy): void {
  const shot = engine.modules.compile(['pulse']).shots[0];
  if (!shot) throw new Error('Expected pulse to compile into a shot');
  const direction = { x: Math.cos(enemy.angle), y: Math.sin(enemy.angle) };
  const launchGap = enemy.radius + shot.size + 1;
  const projectile: Projectile = {
    id: 20_000 + engine.projectiles.length,
    towerId: engine.towers[0].id,
    position: {
      x: enemy.position.x - direction.x * launchGap,
      y: enemy.position.y - direction.y * launchGap,
    },
    velocity: { x: direction.x * shot.speed, y: direction.y * shot.speed },
    targetId: enemy.id,
    damage: 100_000,
    speed: shot.speed,
    radius: shot.size,
    color: shot.color,
    life: shot.lifetime,
    pierce: 0,
    slow: 0,
    splash: 0,
    seeking: 0,
    modules: [...shot.modules],
    shot,
    trailTimer: 1,
    moduleState: {},
    behavior: 'linear',
    age: 0,
    triggered: false,
    triggerCooldown: 0,
    triggerCount: 0,
    trail: [],
  };
  engine.projectiles.push(projectile);
}

describe('splitting enemies', () => {
  it('replaces a defeated fracture core with three smaller non-splitting copies', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 29 });
    engine.spawnCreativeEnemy('fracture');
    const parent = engine.enemies[0];
    if (!parent) throw new Error('Expected a fracture core');
    placeEnemy(engine, parent, 180);
    const parentRadius = parent.radius;
    const parentHp = parent.maxHp;
    const parentSpeed = parent.speed;
    engine.status = 'wave';
    addLethalProjectile(engine, parent);

    engine.update(FIXED_SIMULATION_STEP);

    expect(engine.enemies.filter((enemy) => enemy.type === 'fracture' && !enemy.dead)).toHaveLength(0);
    expect(engine.enemies).toContain(parent);
    expect(engine.getSplitRifts()).toHaveLength(1);
    expect(engine.status).toBe('wave');
    const splitDelaySteps = Math.ceil(FRACTURE_SPLIT_DELAY / FIXED_SIMULATION_STEP);
    for (let step = 0; step < splitDelaySteps - 1; step += 1) engine.update(FIXED_SIMULATION_STEP);
    expect(engine.enemies.filter((enemy) => enemy.type === 'fracture' && !enemy.dead)).toHaveLength(0);
    expect(engine.enemies).toContain(parent);
    engine.update(FIXED_SIMULATION_STEP);

    const children = engine.enemies.filter((enemy) => enemy.type === 'fracture');
    expect(children).toHaveLength(3);
    expect(engine.enemies).not.toContain(parent);
    expect(engine.getSplitRifts()).toHaveLength(1);
    expect(children.every((enemy) => enemy.splitGeneration === 1)).toBe(true);
    expect(children.every((enemy) => enemy.radius < parentRadius)).toBe(true);
    expect(children.every((enemy) => enemy.maxHp === Math.round(parentHp * 0.3))).toBe(true);
    expect(children.map((enemy) => enemy.distance - parent.distance)).toEqual([-25, 0, 25]);
    expect(children.every((enemy) => enemy.speed === parentSpeed * 1.35)).toBe(true);
    expect(children.every((enemy) => enemy.reward === 8 && enemy.coreDamage === 2)).toBe(true);
    expect(engine.status).toBe('wave');

    const [child, ...siblings] = children;
    if (!child) throw new Error('Expected a split child');
    siblings.forEach((enemy) => { enemy.dead = true; });
    placeEnemy(engine, child, 240);
    addLethalProjectile(engine, child);
    engine.update(FIXED_SIMULATION_STEP);

    expect(engine.enemies.filter((enemy) => enemy.type === 'fracture')).toHaveLength(0);
  });
});
