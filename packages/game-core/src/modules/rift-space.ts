import type { Point, Projectile } from '../game/types';
import type { ModuleCombatApi } from './types';

export const RIFT_SPACE_COLOR = '#7c3fc2';
export const RIFT_SPACE_RETENTION = 2.5;

export const RIFT_SPACE_CONTACT = {
  width: 18,
  settlementInterval: 0.25,
  modifierInterval: 0.25,
  effectInterval: 0.25,
} as const;

interface ExtendSpatialRiftOptions {
  duration: number;
  damagePerSecond: number;
  hitEffectId: string;
  initialPosition?: Point;
  visual?: {
    type: 'diamond';
    center: Point;
    radius: number;
  };
  jitter?: number;
}

export const extendSpatialRift = (
  combat: ModuleCombatApi,
  source: Projectile,
  key: string,
  position: Point,
  options: ExtendSpatialRiftOptions,
): void => {
  combat.extendRift(source, key, position, {
    duration: options.duration,
    width: RIFT_SPACE_CONTACT.width,
    damagePerSecond: options.damagePerSecond,
    settlementInterval: RIFT_SPACE_CONTACT.settlementInterval,
    modifierInterval: RIFT_SPACE_CONTACT.modifierInterval,
    effectInterval: RIFT_SPACE_CONTACT.effectInterval,
    color: RIFT_SPACE_COLOR,
    ...(options.initialPosition ? { initialPosition: options.initialPosition } : {}),
    ...(options.visual ? { visual: options.visual } : {}),
    ...(options.jitter === undefined ? {} : { jitter: options.jitter }),
    hitEffectId: options.hitEffectId,
  });
};
