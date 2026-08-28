import type { EnemyShieldConfig } from './config';
import type { Enemy } from './types';

export interface ShieldDamageResult {
  absorbed: number;
  healthDamage: number;
  broke: boolean;
}

export interface ShieldUpdateResult {
  restored: boolean;
}

export function createEnemyShield(
  config: EnemyShieldConfig | undefined,
  healthScale: number,
): Pick<Enemy, 'shield' | 'maxShield' | 'shieldHitFlash' | 'shieldRadiusScale' | 'shieldRippleAge'> {
  const maxShield = config ? Math.round(config.capacity * healthScale) : 0;
  return {
    shield: maxShield,
    maxShield,
    shieldHitFlash: 0,
    shieldRadiusScale: config ? 0.15 : 0,
    shieldRippleAge: Number.POSITIVE_INFINITY,
  };
}

/**
 * Mindustry-style shield damage: positive shield is consumed first and any
 * excess reaches health. Breaking the field creates a negative regeneration
 * debt, so the configured cooldown uses the same regeneration clock.
 */
export function absorbShieldDamage(
  enemy: Enemy,
  damage: number,
  config: EnemyShieldConfig | undefined,
): ShieldDamageResult {
  const safeDamage = Math.max(0, damage);
  if (!config || enemy.shield <= 0 || safeDamage <= 0) {
    return { absorbed: 0, healthDamage: safeDamage, broke: false };
  }

  const absorbed = Math.min(enemy.shield, safeDamage);
  const healthDamage = safeDamage - absorbed;
  enemy.shield -= absorbed;
  enemy.shieldHitFlash = 1;
  enemy.shieldRippleAge = 0;
  const broke = enemy.shield <= 0.0001;
  if (broke) enemy.shield = -config.cooldown * config.regen;
  return { absorbed, healthDamage, broke };
}

export function updateEnemyShield(
  enemy: Enemy,
  config: EnemyShieldConfig | undefined,
  delta: number,
): ShieldUpdateResult {
  if (!config || enemy.maxShield <= 0) return { restored: false };
  const wasOffline = enemy.shield <= 0;
  enemy.shield = Math.min(enemy.maxShield, enemy.shield + config.regen * delta);
  const restored = wasOffline && enemy.shield > 0;
  if (enemy.shield > 0) {
    enemy.shieldRadiusScale += (1 - enemy.shieldRadiusScale) * Math.min(1, delta * 7);
  } else {
    enemy.shieldRadiusScale = 0;
  }
  return { restored };
}

/** Circle-padded containment test matching a regular polygon force field. */
export function isInsideRegularShield(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number,
  radius: number,
  sides: number,
  rotation: number,
  padding = 0,
): boolean {
  const dx = pointX - centerX;
  const dy = pointY - centerY;
  const distance = Math.hypot(dx, dy);
  if (distance <= padding) return true;
  const sector = Math.PI * 2 / sides;
  const halfSector = sector / 2;
  const angle = Math.atan2(dy, dx) - rotation;
  const nearestVertex = ((angle + halfSector) % sector + sector) % sector - halfSector;
  const apothem = radius * Math.cos(halfSector);
  const boundary = apothem / Math.cos(halfSector - Math.abs(nearestVertex));
  return distance <= boundary + padding;
}
