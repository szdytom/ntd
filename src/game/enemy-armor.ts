import type { EnemyArmorConfig } from './config';

/** Caps health damage after shields, so armor never changes shield absorption. */
export function limitEnemyHealthDamage(damage: number, armor?: EnemyArmorConfig): number {
  const safeDamage = Math.max(0, damage);
  if (!armor) return safeDamage;
  return Math.min(safeDamage, Math.max(0, armor.damageCap));
}

/** Caps continuous health damage by elapsed exposure rather than implementation tick rate. */
export function limitEnemyContinuousHealthDamage(
  damage: number,
  duration: number,
  armor?: EnemyArmorConfig,
): number {
  const safeDamage = Math.max(0, damage);
  if (!armor) return safeDamage;
  return Math.min(
    safeDamage,
    Math.max(0, armor.continuousDamageCapPerSecond) * Math.max(0, duration),
  );
}
