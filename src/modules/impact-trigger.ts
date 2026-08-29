import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#f15bb5';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:impact-trigger:release',
    lifetime: 0.38,
    layer: 'air',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 5 + frame.easeOut(3) * 44, 3 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 6; index += 1) {
        const angle = index * Math.PI / 3 + frame.rotation;
        const radius = 11 + frame.easeOut(2) * 34;
        painter.triangle(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, 6 * frame.fout, 13 * frame.fout, angle, index % 2 ? '#fff' : frame.color, frame.fout);
      }
    },
  },
];

export const impactTriggerModule: ModuleDefinition = {
  id: 'impact-trigger',
  kind: 'logic',
  meta: {
    name: 'Impact Trigger', shortName: 'Impact', symbol: '⊛', color, tint: '#ffe7f7', energy: 6, rarity: 'common',
    description: 'Releases the next projectile when the carrier hits', detail: '1 carrier · 1 payload',
  },
  effects,
  compile: (context) => context.wrapNext({ type: 'impact', payloadCount: 1 }),
  onTrigger: ({ effects: engine, position, rotation }) => engine.spawn('module:impact-trigger:release', { position, rotation, color }),
};
