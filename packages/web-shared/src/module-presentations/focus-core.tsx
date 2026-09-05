import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const FocusCoreIcon = createModuleIcon(<>
  <circle className="module-icon__line" cx="16" cy="16" r="10"/>
  <circle className="module-icon__line" cx="16" cy="16" r="5"/>
  <path className="module-icon__thin" d="M16 2v7M16 23v7M2 16h7M23 16h7"/>
  <path className="module-icon__fill" d="M16 13l3 3-3 3-3-3z"/>
</>);
const color = '#e63973';
const effects: readonly EffectDefinition[] = [
    {
        id: 'module:focus-core:charge',
        lifetime: 0.42,
        layer: 'air',
        bloom: 1,
        render: (frame, painter) => {
            const radius = 48 * (1 - frame.easeOut(3)) + 7;
            painter.ring(frame.x, frame.y, radius, 3.4 * frame.fout, frame.color, frame.fout);
            for (let index = 0; index < 6; index += 1) {
                const angle = frame.rotation + index * Math.PI / 3;
                painter.lineAngle(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, angle + Math.PI, 18 * frame.fout, 2 * frame.fout, index % 2 ? '#ffffff' : frame.color, frame.fout);
            }
        },
    },
];
export const focusCoreModule: ModulePresentation = {
    id: 'focus-core',
    icon: FocusCoreIcon,
    meta: {
        color, displayColor: '#e63973', tint: '#ffe6ef'
    },
    effects,
    renderProjectile: ({ ctx, projectile }) => {
        drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 17, color, 0.9);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.78;
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
};
