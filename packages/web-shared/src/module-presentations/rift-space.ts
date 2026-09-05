import type { EffectDefinition } from '../effects/types';
export { extendSpatialRift, RIFT_SPACE_COLOR, RIFT_SPACE_CONTACT, RIFT_SPACE_RETENTION } from '@prism-bastion/game-core/modules/rift-space';

export const RIFT_SPACE_TINT = '#f0e8ff';

export const createRiftCrossEffect = (id: string): EffectDefinition => ({
  id, lifetime: 0.36, layer: 'air', bloom: 1,
  render: (frame, painter) => {
    painter.light(frame.x, frame.y, 42 * frame.slope, frame.color, 0.28 * frame.fout);
    painter.ring(frame.x, frame.y, 4 + frame.easeOut(3) * 25, 2.4 * frame.fout, frame.color, frame.fout);
  },
});
