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
    name: '接近触发器', shortName: '接近触发', symbol: '◉', color, tint: '#ddfff9', energy: 9, rarity: 'uncommon',
    description: '静态载体感应敌人时释放载荷', detail: '配合感应雷或静电哨戒点',
  },
  effects,
  compile: (context) => context.wrapNext({ type: 'proximity', payloadCount: 1 }),
  onTrigger: ({ effects: engine, position }) => engine.spawn('module:proximity-trigger:release', { position, color }),
};
