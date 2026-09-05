import { coneSparks } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { createModuleIcon } from './icons';
import { projectileAngle } from './render-utils';
import type { ModulePresentation } from './types';
const RazorIcon = createModuleIcon(<>
  <circle className="module-icon__line" cx="16" cy="16" r="4"/>
  <path className="module-icon__fill" d="M16 2l4 10-4 4-4-4zM30 16l-10 4-4-4 4-4zM16 30l-4-10 4-4 4 4zM2 16l10-4 4 4-4 4z"/>
</>);
const color = '#00b4d8';
const effects: readonly EffectDefinition[] = [
    {
        id: 'module:razor:muzzle',
        lifetime: 0.26,
        layer: 'air',
        render: (frame, painter) => {
            for (const sign of [-1, 1]) {
                painter.triangle(frame.x, frame.y, 9 * frame.fout, 44 * frame.fout, frame.rotation + sign * 0.12, sign > 0 ? '#fff' : frame.color, frame.fout);
            }
            painter.polygon(frame.x, frame.y, 7 + frame.easeOut(2) * 17, 4, frame.rotation + frame.fin * 2, frame.color, frame.fout, 2.5 * frame.fout);
        },
    },
    coneSparks({ id: 'module:razor:hit', lifetime: 0.24, count: 5, distance: 28, cone: 0.35, length: 13, stroke: 1.5 }),
];
export const razorModule: ModulePresentation = {
    id: 'razor',
    icon: RazorIcon,
    meta: {
        color, displayColor: '#00a2c3', tint: '#e3f8fc'
    },
    effects,
    renderProjectile: ({ ctx, projectile }) => {
        const angle = projectileAngle(projectile.velocity) + projectile.life * 8;
        ctx.save();
        ctx.translate(projectile.position.x, projectile.position.y);
        ctx.rotate(angle);
        for (let index = 0; index < 4; index += 1) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = '#078aa8';
            ctx.strokeStyle = '#63e6f5';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(1.5, -2.2);
            ctx.quadraticCurveTo(7.5, -4.2, 13.5, -0.6);
            ctx.lineTo(7.2, 1.1);
            ctx.quadraticCurveTo(4.2, 2.4, 1.5, 2.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#e9fdff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(2.8, -2.4);
            ctx.quadraticCurveTo(8.2, -3.7, 13.5, -0.6);
            ctx.stroke();
        }
        ctx.fillStyle = '#064e61';
        ctx.strokeStyle = '#8df3ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -3.5);
        ctx.lineTo(3.5, 0);
        ctx.lineTo(0, 3.5);
        ctx.lineTo(-3.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e9fdff';
        ctx.beginPath();
        ctx.moveTo(-0.8, -2.1);
        ctx.lineTo(1.8, -0.2);
        ctx.lineTo(0.4, 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
};
