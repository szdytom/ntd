import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const GeodeBloomIcon = createModuleIcon(<>
  <path className="module-icon__fill" d="M16 2l11 6v16l-11 6-11-6V8z"/>
  <path className="module-icon__cut" d="M16 2v8l-5 6 5 4v10M5 8l6 8-6 8M27 8l-11 12 11 4M11 16l10-4"/>
</>);
const color = '#b34ac5';
const effects: readonly EffectDefinition[] = [
    {
        id: 'module:geode-bloom:muzzle',
        lifetime: 0.34,
        layer: 'air',
        bloom: 1,
        render: (frame, painter) => {
            painter.light(frame.x, frame.y, 62 * frame.fout, frame.color, frame.slope * 0.42);
            for (let index = 0; index < 3; index += 1) {
                painter.polygon(frame.x, frame.y, 7 + frame.easeOut(3) * (24 + index * 7), index === 1 ? 12 : 6, frame.rotation + frame.fin * (index % 2 ? -0.8 : 0.65), index === 1 ? '#ffffff' : frame.color, frame.fout * (1 - index * 0.18), (3.6 - index * 0.6) * frame.fout);
            }
        },
    },
    shockwave({ id: 'module:geode-bloom:blast-outer', lifetime: 0.58, radius: 92, stroke: 5, sides: 6, bloom: 1 }),
    shockwave({ id: 'module:geode-bloom:blast-inner', lifetime: 0.42, radius: 66, stroke: 3, sides: 12, bloom: 0.9 }),
    {
        id: 'module:geode-bloom:shards',
        lifetime: 0.62,
        layer: 'air',
        bloom: 0.9,
        render: (frame, painter) => {
            for (let index = 0; index < 6; index += 1) {
                const angle = frame.rotation + index * Math.PI / 3;
                const travel = 15 + frame.easeOut(3) * (50 + index % 2 * 15);
                painter.polygon(frame.x + Math.cos(angle) * travel, frame.y + Math.sin(angle) * travel, 4 + frame.fout * 7, 4, angle + Math.PI / 4 + frame.fin * 1.5, index % 2 ? '#ffffff' : frame.color, frame.fout, 1.6);
            }
            painter.light(frame.x, frame.y, 75 * frame.fout, frame.color, frame.slope * 0.4);
        },
    },
    coneSparks({ id: 'module:geode-bloom:debris', lifetime: 0.64, count: 24, distance: 96, length: 17, stroke: 2.5, bloom: 1 }),
];
export const geodeBloomModule: ModulePresentation = {
    id: 'geode-bloom',
    icon: GeodeBloomIcon,
    meta: {
        color, displayColor: '#b34ac5', tint: '#f8e8ff'
    },
    effects,
    renderProjectile: ({ ctx, projectile }) => {
        const radius = projectile.radius;
        drawGlow(ctx, projectile.position.x, projectile.position.y, radius * 2.4, color, 0.5);
        ctx.save();
        ctx.translate(projectile.position.x, projectile.position.y);
        ctx.rotate(projectile.age * 2.8);
        ctx.fillStyle = '#672279';
        ctx.strokeStyle = '#f3b5ff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let index = 0; index < 12; index += 1) {
            const angle = index * Math.PI / 6;
            const pointRadius = index % 2 === 0 ? radius : radius * 0.8;
            const x = Math.cos(angle) * pointRadius;
            const y = Math.sin(angle) * pointRadius;
            if (index === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#d77ee6';
        ctx.lineWidth = 1;
        for (let index = 0; index < 6; index += 1) {
            const angle = index * Math.PI / 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9);
            ctx.stroke();
        }
        ctx.fillStyle = '#fff0ff';
        ctx.beginPath();
        ctx.arc(-radius * 0.2, -radius * 0.2, Math.max(2, radius * 0.22), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};
