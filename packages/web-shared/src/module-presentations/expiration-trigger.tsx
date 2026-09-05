import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const ExpirationTriggerIcon = createModuleIcon(<>
  <path className="module-icon__line" d="M8 4h16M8 28h16M10 5c0 6 6 7 6 11s-6 5-6 11M22 5c0 6-6 7-6 11s6 5 6 11"/>
  <path className="module-icon__fill" d="M12 8h8l-4 5zM11 25l5-6 5 6z"/>
</>);
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
                painter.lineAngle(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, angle, 12 * frame.fout, 2.4 * frame.fout, index % 2 === 0 ? '#fff' : frame.color, frame.fout);
            }
        },
    },
];
export const expirationTriggerModule: ModulePresentation = {
    id: 'expiration-trigger',
    icon: ExpirationTriggerIcon,
    meta: {
        color, displayColor: '#df7a39', tint: '#fff0e3'
    },
    effects
};
