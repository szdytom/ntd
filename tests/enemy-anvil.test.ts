import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/game/config';
import { limitEnemyContinuousHealthDamage, limitEnemyHealthDamage } from '../src/game/enemy-armor';
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

describe('Prism Anvil layered armor elite', () => {
  it('caps only health damage above its configured threshold', () => {
    const config = ENEMIES.anvil;
    const cap = config.armor.damageCap;

    expect(cap).toBeGreaterThan(0);
    expect(limitEnemyHealthDamage(cap / 2, config.armor)).toBe(cap / 2);
    expect(limitEnemyHealthDamage(cap, config.armor)).toBe(cap);
    expect(limitEnemyHealthDamage(cap * 10, config.armor)).toBe(cap);
    const continuousCap = config.armor.continuousDamageCapPerSecond;
    expect(limitEnemyContinuousHealthDamage(continuousCap * 10, 0.5, config.armor)).toBe(continuousCap * 0.5);
    expect(limitEnemyContinuousHealthDamage(continuousCap * 10, 1, config.armor)).toBe(continuousCap);
  });

  it('rotates slowly independent of its travel direction', () => {
    const first = enemyVisualRotation('anvil', 2, 1.7, 0.3);
    const otherDirection = enemyVisualRotation('anvil', 2, -0.8, 0.3);
    const later = enemyVisualRotation('anvil', 3, 1.7, 0.3);

    expect(otherDirection).toBe(first);
    expect(later).toBeGreaterThan(first);
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
    const cap = ENEMIES.anvil.armor.damageCap;
    if (!shot || shot.damage <= cap) throw new Error('Expected a projectile above the armor cap');
    fireAt(engine, shot, enemy);

    for (let step = 0; step < 120 && enemy.hp === enemy.maxHp; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }

    expect(enemy.hp).toBe(enemy.maxHp - cap);
  });
});
