import { coneSparks } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import { createModuleIcon } from './icons';
import type { ModulePresentation } from './types';
const ArcboltIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M5 8h8l-3 7h10l-5 10"/>
  <circle className="module-icon__fill" cx="5" cy="8" r="2.5"/>
  <circle className="module-icon__fill" cx="15" cy="25" r="2.5"/>
  <circle className="module-icon__line" cx="25" cy="8" r="3"/>
  <path className="module-icon__thin" d="M20 15l5-4"/>
</>);
const color = '#4361ee';
const dischargeCount = 5;
function dischargeNoise(seed: number): number {
    const value = Math.sin(seed) * 43758.5453;
    return value - Math.floor(value);
}
const effects: readonly EffectDefinition[] = [
    {
        id: 'module:arcbolt:muzzle',
        lifetime: 0.24,
        layer: 'air',
        bloom: 0.95,
        render: (frame, painter) => {
            painter.ring(frame.x, frame.y, 4 + frame.easeOut(3) * 30, 2.8 * frame.fout, frame.color, frame.fout);
            for (let index = 0; index < 5; index += 1) {
                const angle = frame.rotation + frame.random(index, -0.45, 0.45);
                painter.lineAngle(frame.x, frame.y, angle, frame.random(index + 20, 17, 38) * frame.fout, 2 * frame.fout, index % 2 ? '#fff' : frame.color, frame.fout);
            }
        },
    },
    {
        id: 'module:arcbolt:chain',
        lifetime: 0.22,
        layer: 'air',
        bloom: 1,
        render: (frame, painter) => {
            const target = (frame.data as {
                x: number;
                y: number;
            }).x === undefined
                ? { x: frame.x, y: frame.y }
                : frame.data as {
                    x: number;
                    y: number;
                };
            const dx = target.x - frame.x;
            const dy = target.y - frame.y;
            const length = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const segments = Math.max(3, Math.ceil(length / 18));
            let lastX = frame.x;
            let lastY = frame.y;
            for (let index = 1; index <= segments; index += 1) {
                const progress = index / segments;
                const normal = index === segments ? 0 : frame.random(index, -7, 7) * frame.fout;
                const x = frame.x + dx * progress + Math.cos(angle + Math.PI / 2) * normal;
                const y = frame.y + dy * progress + Math.sin(angle + Math.PI / 2) * normal;
                painter.line(lastX, lastY, x, y, 3.2 * frame.fout + 0.4, index % 2 ? '#ffffff' : frame.color, frame.fout);
                lastX = x;
                lastY = y;
            }
            painter.light(target.x, target.y, 25 * frame.fout, frame.color, 0.28 * frame.fout);
        },
    },
    coneSparks({ id: 'module:arcbolt:hit', lifetime: 0.3, count: 8, distance: 38, length: 10, stroke: 1.8, bloom: 0.9 }),
];
export const arcboltModule: ModulePresentation = {
    id: 'arcbolt',
    icon: ArcboltIcon,
    meta: {
        color, displayColor: '#4361ee', tint: '#e9edff'
    },
    effects,
    renderProjectile: ({ ctx, projectile }) => {
        drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 5, color, 0.18);
        ctx.save();
        ctx.translate(projectile.position.x, projectile.position.y);
        const dischargeFrame = Math.floor(projectile.age * 22);
        for (let index = 0; index < dischargeCount; index += 1) {
            const seed = projectile.id * 17.17 + dischargeFrame * 3.31 + index * 7.13;
            const angle = index * Math.PI * 2 / dischargeCount + dischargeNoise(seed) * 0.9;
            const length = 14 + dischargeNoise(seed + 1.7) * 10;
            const bend = (dischargeNoise(seed + 3.1) - 0.5) * 7;
            const startX = Math.cos(angle) * 4.5;
            const startY = Math.sin(angle) * 4.5;
            const middleX = Math.cos(angle) * length * 0.52 + Math.cos(angle + Math.PI / 2) * bend;
            const middleY = Math.sin(angle) * length * 0.52 + Math.sin(angle + Math.PI / 2) * bend;
            const endX = Math.cos(angle) * length;
            const endY = Math.sin(angle) * length;
            ctx.globalAlpha = index % 2 === 0 ? 0.95 : 0.78;
            ctx.strokeStyle = index % 2 === 0 ? '#e9edff' : '#7890ff';
            ctx.lineWidth = index % 2 === 0 ? 1.1 : 0.85;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(middleX, middleY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            if (index % 2 === dischargeFrame % 2) {
                const branchAngle = angle + (dischargeNoise(seed + 5.3) > 0.5 ? 0.72 : -0.72);
                const branchLength = 4 + dischargeNoise(seed + 7.9) * 3;
                ctx.globalAlpha *= 0.72;
                ctx.beginPath();
                ctx.moveTo(middleX, middleY);
                ctx.lineTo(middleX + Math.cos(branchAngle) * branchLength, middleY + Math.sin(branchAngle) * branchLength);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
        ctx.rotate(projectile.age * 3.5);
        ctx.fillStyle = '#17215c';
        ctx.strokeStyle = '#7890ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let index = 0; index < 6; index += 1) {
            const angle = index * Math.PI / 3;
            const x = Math.cos(angle) * 5.4;
            const y = Math.sin(angle) * 5.4;
            if (index === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2.2, -3.1);
        ctx.lineTo(1.1, -0.6);
        ctx.lineTo(-0.9, 3.1);
        ctx.stroke();
        ctx.restore();
    }
};
