import type { EnergyRefundBudget, Point, Projectile, ShotBlueprint } from './types';

export interface ProjectileStateOptions {
  id: number;
  towerId: number;
  shot: ShotBlueprint;
  position: Point;
  velocity: Point;
  targetId?: number | null;
  energyRefundBudget?: EnergyRefundBudget;
  trailTimer?: number;
}

export function createProjectileState({
  id,
  towerId,
  shot,
  position,
  velocity,
  targetId = null,
  energyRefundBudget,
  trailTimer = 0,
}: ProjectileStateOptions): Projectile {
  const isStatic = shot.static !== undefined;
  return {
    id,
    towerId,
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
    ...(energyRefundBudget ? { energyRefundBudget } : {}),
    trailTimer,
    moduleState: {},
    behavior: isStatic ? 'static' : 'linear',
    age: 0,
    triggered: false,
    triggerCooldown: 0,
    triggerCount: 0,
    trail: [],
  };
}
