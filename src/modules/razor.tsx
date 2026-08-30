import { coneSparks } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import { projectileAngle } from './render-utils';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const RazorIcon = createModuleIcon(<>
  <circle className="module-icon__line" cx="16" cy="16" r="4" />
  <path className="module-icon__fill" d="M16 2l4 10-4 4-4-4zM30 16l-10 4-4-4 4-4zM16 30l-4-10 4-4 4 4zM2 16l10-4 4 4-4 4z" />
</>);

const color = '#00b4d8';
const stats = { damage: 14, speed: 400, size: 8, maxTargets: 5, lifetime: 2 } as const;

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

export const razorModule: ModuleDefinition = {
  id: 'razor',
  kind: 'projectile',
  tags: ['projectile'],
  icon: RazorIcon,
  meta: {
    name: 'Returning Razor', shortName: 'Razor', color, tint: '#e3f8fc', energy: 24, rarity: 'rare',
    text: { detail: { damage: stats.damage, targets: stats.maxTargets } },
  },
  effects,
  compile: (context) => context.emitProjectile({
    damage: stats.damage,
    speed: stats.speed,
    size: stats.size,
    pierce: stats.maxTargets - 1,
    lifetime: stats.lifetime,
  }),
  renderProjectile: ({ ctx, projectile }) => {
    const angle = projectileAngle(projectile.velocity) + projectile.life * 8;
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 14, color, 0.9);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    for (let index = 0; index < 4; index += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(1, -2);
      ctx.lineTo(12, 0);
      ctx.lineTo(1, 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:razor:muzzle', { position, rotation, color }),
  onHit: ({ effects: engine, position, rotation }) => engine.spawn('module:razor:hit', { position, rotation, color }),
};
