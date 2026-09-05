import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const TerrainTriggerIcon = createModuleIcon(<>
  <path className="module-icon__thin" d="M2 6h28M2 26h28M16 7v18" strokeDasharray="2 3"/>
  <path className="module-icon__thick" d="M3 16h18"/>
  <path className="module-icon__fill" d="M16 11l7 5-7 5z"/>
  <circle className="module-icon__fill" cx="27" cy="10" r="2"/>
  <circle className="module-icon__fill" cx="27" cy="16" r="2"/>
  <circle className="module-icon__fill" cx="27" cy="22" r="2"/>
</>);
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
export const terrainTriggerModule: ModulePresentation = {
    id: 'terrain-trigger',
    icon: TerrainTriggerIcon,
    meta: {
        color, displayColor: '#3a86ff', tint: '#e8f1ff'
    },
    effects
};
