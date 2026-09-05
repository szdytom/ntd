import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const TimerTriggerIcon = createModuleIcon(<>
  <rect className="module-icon__line" x="5" y="5" width="22" height="22"/>
  <circle className="module-icon__line" cx="16" cy="16" r="7"/>
  <path className="module-icon__thick" d="M16 10v7l5 3"/>
  <path className="module-icon__fill" d="M13 2h6v4h-6z"/>
</>);
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
export const timerTriggerModule: ModulePresentation = {
    id: 'timer-trigger',
    icon: TimerTriggerIcon,
    meta: {
        color, displayColor: '#a7952a', tint: '#fff9d9'
    },
    effects
};
