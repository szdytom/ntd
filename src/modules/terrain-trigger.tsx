import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const TerrainTriggerIcon = createModuleIcon(<>
  <path className="module-icon__thin" d="M2 6h28M2 26h28M16 7v18" strokeDasharray="2 3" />
  <path className="module-icon__thick" d="M3 16h18" />
  <path className="module-icon__fill" d="M16 11l7 5-7 5z" />
  <circle className="module-icon__fill" cx="27" cy="10" r="2" />
  <circle className="module-icon__fill" cx="27" cy="16" r="2" />
  <circle className="module-icon__fill" cx="27" cy="22" r="2" />
</>);

const color = '#3a86ff';
const stats = { crossingTicks: 1, payloadCount: 1 } as const;

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
  tags: ['trigger'],
  icon: TerrainTriggerIcon,
  meta: {
    name: 'Terrain Trigger', shortName: 'Terrain', color, tint: '#e8f1ff', energy: 9, rarity: 'uncommon',
    text: { detail: { ticks: stats.crossingTicks, payloads: stats.payloadCount } },
  },
  effects,
  compile: (context) => context.wrapNext({
    type: 'terrain',
    payloadCount: stats.payloadCount,
    crossingTicks: stats.crossingTicks,
  }),
  onTrigger: ({ effects: engine, position, rotation }) => engine.spawn('module:terrain-trigger:release', { position, rotation, color }),
};
