import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const EchoIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M11 7v18M21 7v18" />
  <path className="module-icon__thin" d="M7 10l4-3 4 3M17 10l4-3 4 3" />
</>);

const color = '#8e44ad';
const stats = { repeats: 2, repeatDelay: 0.16 } as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:echo:ripple',
    lifetime: 0.46,
    layer: 'ground',
    render: (frame, painter) => {
      for (let index = 0; index < stats.repeats; index += 1) {
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
  tags: ['repeat'],
  icon: EchoIcon,
  meta: {
    color, displayColor: '#8e44ad', tint: '#f1e7f7', energy: 24, rarity: 'rare',
    text: { detail: { casts: stats.repeats, interval: stats.repeatDelay } },
  },
  effects,
  compile: (context) => context.modifyNext(stats),
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:echo:ripple', { position, rotation, color }),
};
