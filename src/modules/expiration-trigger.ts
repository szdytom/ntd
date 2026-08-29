import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#ff8c42';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:expiration-trigger:release',
    lifetime: 0.46,
    layer: 'air',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 8 + frame.easeOut(3) * 50, 3 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 8; index += 1) {
        const angle = frame.rotation + index * Math.PI / 4;
        const radius = 8 + frame.easeOut(2) * 42;
        painter.lineAngle(
          frame.x + Math.cos(angle) * radius,
          frame.y + Math.sin(angle) * radius,
          angle,
          12 * frame.fout,
          2.4 * frame.fout,
          index % 2 === 0 ? '#fff' : frame.color,
          frame.fout,
        );
      }
    },
  },
];

export const expirationTriggerModule: ModuleDefinition = {
  id: 'expiration-trigger',
  kind: 'logic',
  meta: {
    name: 'Expiration Trigger', shortName: 'Expiration', symbol: '✺', color, tint: '#fff0e3', energy: 12, rarity: 'rare',
    description: 'Releases the payload when the carrier disappears', detail: 'Last hit or lifetime end · Ignores world bounds · 1 payload',
  },
  effects,
  compile: (context) => context.wrapNext({ type: 'expiration', payloadCount: 1 }),
  onTrigger: ({ effects: engine, position, rotation }) => engine.spawn('module:expiration-trigger:release', { position, rotation, color }),
};
