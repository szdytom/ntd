import { describe, expect, it } from 'vitest';
import { ENEMIES, LEVELS } from '../src/game/config';
import { limitEnemyHealthDamage } from '../src/game/enemy-armor';
import { enemyVisualRotation } from '../src/game/enemy-visuals';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Enemy, Projectile, ShotBlueprint } from '../src/game/types';

const placeEnemy = (engine: GameEngine, enemy: Enemy, pathDistance: number): void => {
  const at = engine.path.pointAtDistance(pathDistance);
  enemy.speed = 0;
  enemy.distance = pathDistance;
  enemy.progress = pathDistance / engine.path.length;
  enemy.position = at.position;
  enemy.angle = at.angle;
};

const fireAt = (engine: GameEngine, shot: ShotBlueprint, enemy: Enemy): Projectile => {
  const direction = { x: Math.cos(enemy.angle), y: Math.sin(enemy.angle) };
  const launchGap = enemy.radius + shot.size + 2;
  const projectile: Projectile = {
    id: 70_000,
    towerId: engine.towers[0]?.id ?? -1,
    position: {
      x: enemy.position.x - direction.x * launchGap,
      y: enemy.position.y - direction.y * launchGap,
    },
    velocity: { x: direction.x * shot.speed, y: direction.y * shot.speed },
    targetId: enemy.id,
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
  return projectile;
};

describe('Prism Anvil layered armor boss', () => {
  it('uses the requested stats and caps only damage above six', () => {
    const config = ENEMIES.anvil;

    expect(config).toMatchObject({
      hp: 480,
      speed: 26,
      radius: 34,
      sides: 5,
      shape: 'anvil',
      armor: { damageCap: 6 },
    });
    expect(limitEnemyHealthDamage(5, config.armor)).toBe(5);
    expect(limitEnemyHealthDamage(6, config.armor)).toBe(6);
    expect(limitEnemyHealthDamage(80, config.armor)).toBe(6);
  });

  it('rotates slowly independent of its travel direction', () => {
    expect(enemyVisualRotation('anvil', 2, 1.7, 0.3)).toBeCloseTo(1.4, 8);
    expect(enemyVisualRotation('anvil', 3, -0.8, 0.3)).toBeCloseTo(1.95, 8);
  });

  it('applies the cap in the shared combat damage path', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 101 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a tower');
    tower.slots.fill(null);
    tower.energy = 0;
    tower.energyRegen = 0;
    engine.spawnCreativeEnemy('anvil');
    const enemy = engine.enemies[0];
    if (!enemy) throw new Error('Expected a Prism Anvil');
    placeEnemy(engine, enemy, 200);
    const shot = engine.modules.compile(['overdrive', 'colossus', 'pulse']).shots[0];
    if (!shot || shot.damage <= 10) throw new Error('Expected a heavy projectile');
    fireAt(engine, shot, enemy);

    for (let step = 0; step < 120 && enemy.hp === enemy.maxHp; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    expect(enemy.hp).toBe(enemy.maxHp - 6);
  });

  it('appears immediately before the Radiant Lag Ring wave in Rose Circuit', () => {
    const roseCircuit = LEVELS.find((level) => level.id === 'rose-circuit');
    if (!roseCircuit) throw new Error('Expected Rose Circuit');

    expect(roseCircuit.waves.at(-2)).toContain('anvil');
    expect(roseCircuit.waves.at(-2)).not.toContain('radiant');
    expect(roseCircuit.waves.at(-1)).toContain('radiant');
    expect(roseCircuit.waves.slice(0, -2).flat()).not.toContain('anvil');
  });
});
