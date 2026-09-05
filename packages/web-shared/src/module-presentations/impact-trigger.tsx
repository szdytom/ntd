import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const ImpactTriggerIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M3 16h13M21 5v22"/>
  <path className="module-icon__fill" d="M11 10l8 6-8 6z"/>
  <path className="module-icon__line" d="M24 10l5-4M24 16h6M24 22l5 4"/>
</>);
const color = '#f15bb5';
const effects: readonly EffectDefinition[] = [
    {
        id: 'module:impact-trigger:release',
        lifetime: 0.38,
        layer: 'air',
        render: (frame, painter) => {
            painter.ring(frame.x, frame.y, 5 + frame.easeOut(3) * 44, 3 * frame.fout, frame.color, frame.fout);
            for (let index = 0; index < 6; index += 1) {
                const angle = index * Math.PI / 3 + frame.rotation;
                const radius = 11 + frame.easeOut(2) * 34;
                painter.triangle(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, 6 * frame.fout, 13 * frame.fout, angle, index % 2 ? '#fff' : frame.color, frame.fout);
            }
        },
    },
];
export const impactTriggerModule: ModulePresentation = {
    id: 'impact-trigger',
    icon: ImpactTriggerIcon,
    meta: {
        color, displayColor: '#f15bb5', tint: '#ffe7f7'
    },
    effects
};
