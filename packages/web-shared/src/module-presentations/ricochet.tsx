import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const RicochetIcon = createModuleIcon(<>
  <path className="module-icon__thin" d="M4 5v22M28 5v22"/>
  <path className="module-icon__thick" d="M6 23l8-13 6 10 6-8"/>
  <path className="module-icon__fill" d="M22 8l7 1-2 7z"/>
</>);
const color = '#f72585';
const RICOCHET_DASH: number[] = [3, 3];
const effects: readonly EffectDefinition[] = [
    {
        id: 'module:ricochet:turn',
        lifetime: 0.3,
        layer: 'air',
        render: (frame, painter) => {
            const target = frame.data as {
                x: number;
                y: number;
            };
            const angle = Math.atan2(target.y - frame.y, target.x - frame.x);
            const length = Math.hypot(target.x - frame.x, target.y - frame.y);
            painter.lineAngle(frame.x, frame.y, angle, length * frame.easeOut(3), 2.5 * frame.fout, frame.color, frame.fout * 0.7);
            painter.triangle(frame.x + Math.cos(angle) * length * frame.easeOut(3), frame.y + Math.sin(angle) * length * frame.easeOut(3), 7 * frame.fout, 14 * frame.fout, angle, '#ffffff', frame.fout);
            painter.ring(frame.x, frame.y, 5 + frame.easeOut(2) * 22, 2 * frame.fout, frame.color, frame.fout);
        },
    },
];
export const ricochetModule: ModulePresentation = {
    id: 'ricochet',
    icon: RicochetIcon,
    meta: {
        color, displayColor: '#f72585', tint: '#ffe7f2'
    },
    effects,
    renderProjectile: ({ ctx, projectile }) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.65;
        ctx.setLineDash(RICOCHET_DASH);
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
};
