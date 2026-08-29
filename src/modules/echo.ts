import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#8e44ad';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:echo:ripple',
    lifetime: 0.46,
    layer: 'ground',
    render: (frame, painter) => {
      for (let index = 0; index < 2; index += 1) {
        const local = Math.max(0, Math.min(1, frame.fin * 1.55 - index * 0.34));
        if (local <= 0) continue;
        const fade = 1 - local;
        painter.ring(frame.x, frame.y, 7 + (1 - (1 - local) ** 3) * 43, 3 * fade + 0.3, index === 0 ? frame.color : '#ffffff', fade * 0.72);
      }
      painter.polygon(frame.x, frame.y, 11 + frame.slope * 8, 6, frame.rotation - frame.fin * 0.7, frame.color, frame.fout * 0.38, 1.5);
    },
  },
];

export const echoModule: ModuleDefinition = {
  id: 'echo',
  kind: 'logic',
  meta: {
    name: 'Echo Command', shortName: 'Echo', symbol: 'Ⅱ', color, tint: '#f1e7f7', energy: 18, rarity: 'rare',
    description: 'Executes the next shot again after a delay', detail: 'Double cast · 0.16 second interval',
  },
  effects,
  compile: (context) => context.modifyNext({ repeats: 2, repeatDelay: 0.16 }),
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:echo:ripple', { position, rotation, color }),
};
