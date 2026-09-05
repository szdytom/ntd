import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const CondenseCoreIcon = createModuleIcon(<>
  <circle className="module-icon__fill" cx="16" cy="16" r="4"/>
  <path className="module-icon__line" d="M3 8l8 5M29 8l-8 5M3 24l8-5M29 24l-8-5"/>
  <path className="module-icon__fill" d="M10 9l2 5-5-1zM22 9l-2 5 5-1zM10 23l2-5-5 1zM22 23l-2-5 5 1z"/>
</>);
const color = '#d1495b';
const effects: readonly EffectDefinition[] = [
    {
        id: 'module:condense-core:collapse',
        lifetime: 0.4,
        layer: 'air',
        bloom: 0.9,
        render: (frame, painter) => {
            const outer = 55 * (1 - frame.easeOut(3)) + 5;
            painter.ring(frame.x, frame.y, outer, 3 * frame.fout, frame.color, frame.fout);
            painter.ring(frame.x, frame.y, outer * 0.58, 1.6 * frame.fout, '#ffffff', frame.fout * 0.8);
            painter.light(frame.x, frame.y, 34 * frame.fout, frame.color, frame.slope * 0.45);
        },
    },
];
export const condenseCoreModule: ModulePresentation = {
    id: 'condense-core',
    icon: CondenseCoreIcon,
    meta: {
        color, displayColor: '#d1495b', tint: '#ffe9ec'
    },
    effects,
    renderProjectile: ({ ctx, projectile }) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.7;
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};
