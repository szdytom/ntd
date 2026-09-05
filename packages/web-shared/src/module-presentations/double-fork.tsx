import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const DoubleForkIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M16 29V17M16 19L8 9M16 19l8-10"/>
  <path className="module-icon__fill" d="M5 4l8 4-7 6zM27 4l-1 10-7-6z"/>
</>);
const color = '#20a486';
const effects: readonly EffectDefinition[] = [{
        id: 'module:double-fork:split',
        lifetime: 0.28,
        layer: 'air',
        render: (frame, painter) => {
            for (const offset of [-0.16, 0.16]) {
                const angle = frame.rotation + offset;
                const start = 6 + frame.fin * 8;
                painter.lineAngle(frame.x + Math.cos(angle) * start, frame.y + Math.sin(angle) * start, angle, 32 * frame.fout + 6, 3 * frame.fout + 0.4, offset < 0 ? '#ffffff' : frame.color, frame.fout);
                painter.circle(frame.x + Math.cos(angle) * (37 * frame.fout + 8), frame.y + Math.sin(angle) * (37 * frame.fout + 8), 3 * frame.fout, frame.color, frame.fout);
            }
        },
    }];
export const doubleForkModule: ModulePresentation = {
    id: 'double-fork',
    icon: DoubleForkIcon,
    meta: {
        color, displayColor: '#20a486', tint: '#e1f8f1'
    },
    effects
};
