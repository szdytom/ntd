import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#fee440';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:timer-trigger:release',
    lifetime: 0.42,
    layer: 'air',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 8 + frame.easeOut(3) * 40, 3 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 4; index += 1) {
        const angle = index * Math.PI / 2 - Math.PI / 2;
        const radius = 22 + frame.fin * 15;
        painter.lineAngle(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, angle + Math.PI, 9 * frame.fout, 3 * frame.fout, index === 0 ? '#fff' : frame.color, frame.fout);
      }
      painter.circle(frame.x, frame.y, 7 * frame.fout, '#fff', frame.fout);
    },
  },
];

export const timerTriggerModule: ModuleDefinition = {
  id: 'timer-trigger',
  kind: 'logic',
  meta: {
    name: 'Timer Trigger', shortName: 'Timer', symbol: '◷', color, tint: '#fff9d9', energy: 7, rarity: 'common',
    description: 'Releases the payload when the carrier timer ends or collides early', detail: 'Up to 0.55 second delay · 1 payload',
  },
  effects,
  compile: (context) => context.wrapNext({ type: 'timer', payloadCount: 1, delay: 0.55 }),
  onTrigger: ({ effects: engine, position }) => engine.spawn('module:timer-trigger:release', { position, color }),
};
