import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/game/config';
import { absorbShieldDamage, createEnemyShield, isInsideRegularShield, updateEnemyShield } from '../src/game/enemy-shield';
import type { Enemy } from '../src/game/types';

const shieldConfig = ENEMIES.crown.shield;

function shieldEnemy(): Enemy {
  return {
    id: 1,
    type: 'crown',
    progress: 0,
    distance: 0,
    position: { x: 0, y: 0 },
    angle: 0,
    hp: 100,
    maxHp: 100,
    speed: 0,
    reward: 0,
    coreDamage: 1,
    radius: 10,
    splitGeneration: 0,
    slowFactor: 0,
    slowTime: 0,
    hitFlash: 0,
    ...createEnemyShield(shieldConfig, 1),
    statuses: [],
    dead: false,
  };
}

describe('enemy shield', () => {
  it('absorbs damage before health and carries overflow', () => {
    const enemy = shieldEnemy();
    const firstHit = enemy.maxShield * 0.4;
    const remainingShield = enemy.maxShield - firstHit;
    const overflow = enemy.maxShield * 0.25;

    expect(absorbShieldDamage(enemy, firstHit, shieldConfig)).toEqual({
      absorbed: firstHit,
      healthDamage: 0,
      broke: false,
    });
    expect(absorbShieldDamage(enemy, remainingShield + overflow, shieldConfig)).toEqual({
      absorbed: remainingShield,
      healthDamage: overflow,
      broke: true,
    });
    expect(enemy.shield).toBe(-shieldConfig.cooldown * shieldConfig.regen);
  });

  it('restores only after regeneration debt has been repaid', () => {
    const enemy = shieldEnemy();
    absorbShieldDamage(enemy, enemy.shield, shieldConfig);

    expect(updateEnemyShield(enemy, shieldConfig, shieldConfig.cooldown)).toBe(false);
    expect(updateEnemyShield(enemy, shieldConfig, 0.25)).toBe(true);
  });

  it('uses regular-polygon containment with projectile padding', () => {
    expect(isInsideRegularShield(0, 0, 0, 0, 72, 6, 0)).toBe(true);
    expect(isInsideRegularShield(0, 0, 90, 0, 72, 6, 0)).toBe(false);
    expect(isInsideRegularShield(0, 0, 75, 0, 72, 6, 0, 4)).toBe(true);
  });
});
