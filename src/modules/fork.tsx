import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const ForkIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M16 29V8M16 18L7 9M16 18l9-9" />
  <path className="module-icon__fill" d="M16 2l4 8h-8zM4 4l7 4-6 5zM28 4l-1 9-6-5z" />
</>);

const color = '#00b894';
const stats = { count: 3, spreadDegrees: 12 } as const;

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
  tags: [],
  icon: ForkIcon,
  meta: {
    color, displayColor: '#00a887', tint: '#e1f8f1', energy: 34, rarity: 'epic',
    text: {
      description: { count: stats.count },
      detail: { count: stats.count, spread: stats.spreadDegrees },
    },
  },
  effects,
  compile: (context) => context.modifyNext({ count: stats.count, spread: stats.spreadDegrees * Math.PI / 180 }),
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:fork:split', { position, rotation, color }),
};
