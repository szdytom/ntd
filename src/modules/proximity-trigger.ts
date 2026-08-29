import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#00f5d4';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:proximity-trigger:release',
    lifetime: 0.34,
    layer: 'ground',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 6 + frame.easeOut(3) * 50, 3 * frame.fout, frame.color, frame.fout);
      painter.ring(frame.x, frame.y, 3 + frame.easeOut(2) * 29, 1.5 * frame.fout, '#fff', frame.fout * 0.8);
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4;
        const radius = 16 + frame.easeOut(2) * 32;
        painter.circle(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, 2.8 * frame.fout, frame.color, frame.fout);
      }
    },
  },
];

export const proximityTriggerModule: ModuleDefinition = {
  id: 'proximity-trigger',
  kind: 'logic',
  meta: {
    name: 'Proximity Trigger', shortName: 'Proximity', symbol: '◉', color, tint: '#ddfff9', energy: 7, rarity: 'uncommon',
    description: 'Releases the payload when a static carrier detects an enemy', detail: 'Pairs with a proximity mine or Tesla sentry',
  },
  effects,
  compile: (context) => context.wrapNext({ type: 'proximity', payloadCount: 1 }),
  onTrigger: ({ effects: engine, position }) => engine.spawn('module:proximity-trigger:release', { position, color }),
};
