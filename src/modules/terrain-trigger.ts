import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#3a86ff';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:terrain-trigger:release',
    lifetime: 0.42,
    layer: 'air',
    render: (frame, painter) => {
      const spread = 12 + frame.easeOut(3) * 38;
      painter.lineAngle(frame.x - spread, frame.y, 0, spread * 2, 3 * frame.fout, frame.color, frame.fout);
      painter.lineAngle(frame.x, frame.y - spread, Math.PI / 2, spread * 2, 2 * frame.fout, '#fff', frame.fout * 0.85);
      painter.ring(frame.x, frame.y, 5 + frame.easeOut(2) * 34, 2.5 * frame.fout, frame.color, frame.fout);
    },
  },
];

export const terrainTriggerModule: ModuleDefinition = {
  id: 'terrain-trigger',
  kind: 'logic',
  meta: {
    name: 'Terrain Trigger', shortName: 'Terrain', symbol: '⌖', color, tint: '#e8f1ff', energy: 9, rarity: 'uncommon',
    description: 'Releases the payload after first crossing the channel centerline', detail: 'First centerline crossing · 1 payload',
  },
  effects,
  compile: (context) => context.wrapNext({ type: 'terrain', payloadCount: 1 }),
  onTrigger: ({ effects: engine, position, rotation }) => engine.spawn('module:terrain-trigger:release', { position, rotation, color }),
};
