import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const EmergencyBatteryIcon = createModuleIcon(<>
  <rect className="module-icon__line" x="6" y="8" width="20" height="18" rx="2"/>
  <path className="module-icon__thick" d="M12 5h8M16 11l-4 7h5l-2 6 6-9h-5z"/>
  <path className="module-icon__fill" d="M8 13h3v8H8zM21 13h3v8h-3z"/>
</>);
const color = '#2fbf71';
const effects: readonly EffectDefinition[] = [{
        id: 'module:emergency-battery:discharge',
        lifetime: 0.34,
        layer: 'air',
        bloom: 0.8,
        render: (frame, painter) => {
            painter.ring(frame.x, frame.y, 7 + frame.easeOut(3) * 34, 2.6 * frame.fout, frame.color, frame.fout);
            for (let index = 0; index < 4; index += 1) {
                const angle = frame.rotation + index * Math.PI / 2;
                const radius = 10 + frame.easeOut(2) * 25;
                painter.lineAngle(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, angle, 9 * frame.fout, 2.2 * frame.fout, index === 0 ? '#ffffff' : frame.color, frame.fout);
            }
        },
    }];
export const emergencyBatteryModule: ModulePresentation = {
    id: 'emergency-battery',
    icon: EmergencyBatteryIcon,
    meta: {
        color, displayColor: '#29a964', tint: '#e7faef'
    },
    effects
};
