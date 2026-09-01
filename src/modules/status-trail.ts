import type { Point, Projectile } from '../game/types';
import type { ModuleCombatApi } from './types';

interface StatusTrailOptions {
  moduleId: string;
  duration: number;
  width: number;
  damageMultiplierPerSecond: number;
  settlementInterval: number;
  color: string;
  statusDuration: number;
  statusInterval: number;
  statusDamage: number;
  statusColor: string;
  statusEffectId: string;
  statusParticleInterval: number;
  hitEffectId: string;
}

/** Extends one effects-only damage band once per carrier trail update. */
export const extendStatusTrail = (
  combat: ModuleCombatApi,
  projectile: Projectile,
  position: Point,
  options: StatusTrailOptions,
): boolean => {
  const updateKey = `${options.moduleId}:last-age`;
  if (projectile.moduleState[updateKey] === projectile.age) return false;
  projectile.moduleState[updateKey] = projectile.age;
  const stacks = projectile.modules.filter((id) => id === options.moduleId).length;
  combat.extendRift(projectile, options.moduleId, position, {
    duration: options.duration,
    width: options.width,
    damagePerSecond: projectile.damage * options.damageMultiplierPerSecond * stacks,
    settlementInterval: options.settlementInterval,
    modifierInterval: options.settlementInterval,
    effectInterval: options.settlementInterval,
    color: options.color,
    coverageGroup: options.moduleId,
    pointLifetime: options.duration,
    contactStatus: {
      id: options.moduleId,
      duration: options.statusDuration,
      interval: options.statusInterval,
      damage: options.statusDamage * stacks,
      color: options.statusColor,
      particle: { effectId: options.statusEffectId, interval: options.statusParticleInterval },
    },
    visual: { type: 'effects-only' },
    hitEffectId: options.hitEffectId,
  });
  return true;
};
