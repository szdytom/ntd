import type { EffectDefinition } from '../effects/types';
import type { Point, Projectile } from '../game/types';
import type { ModuleCombatApi } from './types';

export const RIFT_SPACE_COLOR = '#7c3fc2';
export const RIFT_SPACE_TINT = '#f1e7fa';
export const RIFT_SPACE_RETENTION = 2.5;

export const RIFT_SPACE_CONTACT = {
  width: 18,
  settlementInterval: 0.25,
  modifierInterval: 0.25,
  effectInterval: 0.25,
} as const;

export const createRiftCrossEffect = (id: string): EffectDefinition => ({
  id,
  lifetime: 0.36,
  layer: 'air',
  bloom: 1,
  render: (frame, painter) => {
    painter.light(frame.x, frame.y, 42 * frame.slope, frame.color, 0.28 * frame.fout);
    painter.ring(frame.x, frame.y, 4 + frame.easeOut(3) * 25, 2.4 * frame.fout, frame.color, frame.fout);
    for (let index = 0; index < 6; index += 1) {
      const angle = frame.random(index, 0, Math.PI * 2);
      painter.lineAngle(
        frame.x,
        frame.y,
        angle,
        frame.random(index + 8, 7, 24) * frame.slope,
        1.4 * frame.fout,
        index % 2 ? '#cbb8ff' : frame.color,
        frame.fout,
      );
    }
  },
});

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
