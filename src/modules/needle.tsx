import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import { projectileAngle } from './render-utils';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const NeedleIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M2 25l8-4" />
  <path className="module-icon__line" d="M10 8L23 2v22l-13 6z" />
  <ellipse className="module-icon__line" cx="17" cy="16" rx="3" ry="6" />
  <path className="module-icon__thick" d="M17 16l13-6" />
</>);

const color = '#ff4d8d';
const stats = { damage: 14, speed: 620, size: 4, maxTargets: 3 } as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:needle:muzzle',
    lifetime: 0.24,
    layer: 'air',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 4 + frame.easeOut(3) * 38, 3 * frame.fout, frame.color, frame.fout);
      for (const sign of [-1, 1]) {
        painter.triangle(frame.x, frame.y, 12 * frame.fout, 55, frame.rotation + sign * Math.PI / 2, frame.color, frame.fout);
      }
      painter.triangle(frame.x, frame.y, 7 * frame.fout, 46 * frame.fout, frame.rotation, '#ffffff', frame.fout);
    },
  },
  shockwave({ id: 'module:needle:hit-ring', lifetime: 0.2, radius: 22, stroke: 2 }),
  coneSparks({ id: 'module:needle:hit-sparks', lifetime: 0.35, count: 9, distance: 46, cone: 0.22, length: 13, stroke: 1.7 }),
];

export const needleModule: ModuleDefinition = {
  id: 'needle',
  kind: 'projectile',
  tags: ['projectile'],
  icon: NeedleIcon,
  meta: {
    name: 'Piercing Needle', shortName: 'Needle', color, tint: '#ffe9f1', energy: 22, rarity: 'uncommon',
    text: { detail: { damage: stats.damage, targets: stats.maxTargets } },
  },
  effects,
  compile: (context) => context.emitProjectile({
    damage: stats.damage,
    speed: stats.speed,
    size: stats.size,
    pierce: stats.maxTargets - 1,
  }),
  renderProjectile: ({ ctx, projectile }) => {
    const angle = projectileAngle(projectile.velocity);
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 10, color, 0.9);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-4, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(1, -1, 6, 2);
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:needle:muzzle', { position, rotation, color }),
  onHit: ({ effects: engine, position, rotation }) => {
    engine.spawn('module:needle:hit-ring', { position, color });
    engine.spawn('module:needle:hit-sparks', { position, rotation, color });
  },
};
