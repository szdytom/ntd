import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#ef476f';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:barrage:tick',
    lifetime: 0.25,
    layer: 'ground',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 6 + frame.easeOut(2) * 27, 2.5 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 4; index += 1) {
        const angle = frame.rotation + index * Math.PI / 2;
        const radius = 17 + frame.fin * 12;
        painter.polygon(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, 3.5 * frame.fout, 4, angle, index === 0 ? '#fff' : frame.color, frame.fout);
      }
    },
  },
];

export const barrageModule: ModuleDefinition = {
  id: 'barrage',
  kind: 'logic',
  meta: {
    name: 'Four-Beat Clock', shortName: 'Fourfold', symbol: 'Ⅳ', color, tint: '#ffe7ed', energy: 32, rarity: 'legendary',
    description: 'Rapidly repeats the next shot', detail: '4 consecutive casts · 0.09 second interval',
  },
  effects,
  compile: (context) => context.modifyNext({ repeats: 4, repeatDelay: 0.09 }),
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:barrage:tick', { position, rotation, color }),
};
