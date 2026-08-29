import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#00b894';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:fork:split',
    lifetime: 0.28,
    layer: 'air',
    render: (frame, painter) => {
      for (const offset of [-0.28, 0, 0.28]) {
        const angle = frame.rotation + offset;
        const start = 6 + frame.fin * 8;
        painter.lineAngle(
          frame.x + Math.cos(angle) * start,
          frame.y + Math.sin(angle) * start,
          angle,
          34 * frame.fout + 6,
          3 * frame.fout + 0.4,
          offset === 0 ? '#ffffff' : frame.color,
          frame.fout,
        );
        painter.circle(frame.x + Math.cos(angle) * (39 * frame.fout + 8), frame.y + Math.sin(angle) * (39 * frame.fout + 8), 3 * frame.fout, frame.color, frame.fout);
      }
    },
  },
];

export const forkModule: ModuleDefinition = {
  id: 'fork',
  kind: 'modifier',
  meta: {
    name: 'Triple Fork', shortName: 'Fork', symbol: 'Y', color, tint: '#e1f8f1', energy: 24, rarity: 'rare',
    description: 'Turns the next shot into three projectiles', detail: '3 projectiles · 12° spread',
  },
  effects,
  compile: (context) => context.modifyNext({ count: 3, spread: 12 * Math.PI / 180 }),
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:fork:split', { position, rotation, color }),
};
