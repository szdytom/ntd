import type { DamageCapCapability } from '../types';

export function limitSignalHealthDamage(damage: number, armor?: DamageCapCapability): number {
  const safeDamage = Math.max(0, damage);
  if (!armor) return safeDamage;
  return Math.min(safeDamage, Math.max(0, armor.damageCap));
}

export function limitSignalContinuousHealthDamage(
  damage: number,
  duration: number,
  armor?: DamageCapCapability,
): number {
  const safeDamage = Math.max(0, damage);
  if (!armor) return safeDamage;
  return Math.min(safeDamage, Math.max(0, armor.continuousDamageCapPerSecond) * Math.max(0, duration));
}
