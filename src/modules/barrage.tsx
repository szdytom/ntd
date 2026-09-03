import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const BarrageIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M7 6v20M13 6v20M19 6v20M25 6v20" />
</>);

const color = '#ef476f';
const stats = { repeats: 4, repeatDelay: 0.09 } as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:barrage:tick',
    lifetime: 0.25,
    layer: 'ground',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 6 + frame.easeOut(2) * 27, 2.5 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < stats.repeats; index += 1) {
        const angle = frame.rotation + index * Math.PI * 2 / stats.repeats;
        const radius = 17 + frame.fin * 12;
        painter.polygon(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, 3.5 * frame.fout, stats.repeats, angle, index === 0 ? '#fff' : frame.color, frame.fout);
      }
    },
  },
];

export const barrageModule: ModuleDefinition = {
  id: 'barrage',
  kind: 'logic',
  tags: ['repeat'],
  icon: BarrageIcon,
  meta: {
    color, displayColor: '#ef476f', tint: '#ffe7ed', energy: 46, rarity: 'legendary',
    text: { detail: { casts: stats.repeats, interval: stats.repeatDelay } },
  },
  effects,
  compile: (context) => context.modifyNext(stats),
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:barrage:tick', { position, rotation, color }),
};
