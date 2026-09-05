import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const ColossusIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M16 2l12 7v14l-12 7-12-7V9z"/>
  <path className="module-icon__line" d="M16 8l7 4v8l-7 4-7-4v-8z"/>
  <circle className="module-icon__fill" cx="16" cy="16" r="3"/>
</>);
const color = '#ff7b00';
const effects: readonly EffectDefinition[] = [
    {
        id: 'module:colossus:charge',
        lifetime: 0.42,
        layer: 'air',
        render: (frame, painter) => {
            painter.light(frame.x, frame.y, 65 * frame.fout, frame.color, frame.slope * 0.35);
            for (let index = 0; index < 8; index += 1) {
                const angle = index * Math.PI / 4 + frame.rotation;
                const radius = 48 * frame.fout + 5;
                const x = frame.x + Math.cos(angle) * radius;
                const y = frame.y + Math.sin(angle) * radius;
                painter.triangle(x, y, 7 * frame.slope, 18 * frame.slope, angle + Math.PI, index % 2 ? '#fff' : frame.color, frame.fout);
            }
            painter.ring(frame.x, frame.y, 9 + frame.easeOut(3) * 42, 4 * frame.fout, frame.color, frame.fout);
        },
    },
];
export const colossusModule: ModulePresentation = {
    id: 'colossus',
    icon: ColossusIcon,
    meta: {
        color, displayColor: '#ec7200', tint: '#fff0df'
    },
    effects,
    renderProjectile: ({ ctx, projectile }) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
};
