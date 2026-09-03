import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';
import { projectileAngle } from './render-utils';

const PrismSlugIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M4 7v18M28 7v18" />
  <path className="module-icon__fill" d="M7 16l6-8h6l6 8-6 8h-6z" />
  <path className="module-icon__cut" d="M16 8v16" />
</>);

const color = '#2864c7';
const stats = { damage: 42, speed: 500, size: 6 } as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:prism-slug:muzzle',
    lifetime: 0.26,
    layer: 'air',
    bloom: 0.9,
    render: (frame, painter) => {
      const compression = 18 * (1 - frame.easeOut(3));
      const perpendicular = frame.rotation + Math.PI / 2;
      painter.light(frame.x, frame.y, 42 * frame.fout, frame.color, frame.slope * 0.32);
      for (const side of [-1, 1]) {
        const x = frame.x + Math.cos(perpendicular) * compression * side;
        const y = frame.y + Math.sin(perpendicular) * compression * side;
        painter.lineAngle(
          x,
          y,
          perpendicular,
          28 + frame.fout * 16,
          3.4 * frame.fout,
          side > 0 ? '#ffffff' : frame.color,
          frame.fout,
        );
      }
      painter.lineAngle(frame.x, frame.y, frame.rotation + Math.PI, 58 * frame.fout, 2.6 * frame.fout, frame.color, frame.fout);
      painter.polygon(frame.x, frame.y, 5 + frame.slope * 5, 4, frame.rotation, '#ffffff', frame.fout, 1.5);
    },
  },
  {
    id: 'module:prism-slug:trail',
    lifetime: 0.2,
    layer: 'under-projectile',
    bloom: 0.55,
    render: (frame, painter) => {
      const perpendicular = frame.rotation + Math.PI / 2;
      const offset = 4 + frame.fin * 3;
      for (const side of [-1, 1]) {
        const x = frame.x + Math.cos(perpendicular) * offset * side;
        const y = frame.y + Math.sin(perpendicular) * offset * side;
        painter.lineAngle(x, y, frame.rotation + Math.PI, 9 + frame.fin * 15, 1.5, frame.color, frame.fout * 0.48);
      }
    },
  },
  {
    id: 'module:prism-slug:impact-clamp',
    lifetime: 0.38,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      const distance = 7 + 38 * (1 - frame.easeOut(4));
      for (let index = 0; index < 4; index += 1) {
        const angle = frame.rotation + index * Math.PI / 2;
        const x = frame.x + Math.cos(angle) * distance;
        const y = frame.y + Math.sin(angle) * distance;
        painter.lineAngle(
          x,
          y,
          angle + Math.PI / 2,
          15 + frame.slope * 17,
          3.2 * frame.fout + 0.4,
          index % 2 === 0 ? frame.color : '#ffffff',
          frame.fout,
        );
      }
      painter.polygon(frame.x, frame.y, 4 + frame.slope * 12, 4, frame.rotation + Math.PI / 4, frame.color, frame.fout, 2.5);
      painter.light(frame.x, frame.y, 54 * frame.fout, frame.color, frame.slope * 0.35);
    },
  },
];

export const prismSlugModule: ModuleDefinition = {
  id: 'prism-slug',
  kind: 'projectile',
  tags: ['projectile'],
  icon: PrismSlugIcon,
  meta: {
    color, displayColor: '#2864c7', tint: '#e7f1ff', energy: 27, rarity: 'rare',
    text: { detail: { damage: stats.damage } },
  },
  effects,
  compile: (context) => context.emitProjectile(stats),
  renderProjectile: ({ ctx, projectile }) => {
    const angle = projectileAngle(projectile.velocity);
    const radius = projectile.radius;
    drawGlow(ctx, projectile.position.x, projectile.position.y, radius * 2.5, color, 0.42);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#173f86';
    ctx.strokeStyle = '#a8ddff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(radius * 1.9, 0);
    ctx.lineTo(radius * 0.65, -radius * 0.78);
    ctx.lineTo(-radius * 1.2, -radius * 0.62);
    ctx.lineTo(-radius * 1.65, 0);
    ctx.lineTo(-radius * 1.2, radius * 0.62);
    ctx.lineTo(radius * 0.65, radius * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#5fb5ff';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-radius * 1.2, -radius * 0.62);
    ctx.lineTo(0, 0);
    ctx.lineTo(-radius * 1.2, radius * 0.62);
    ctx.moveTo(0, 0);
    ctx.lineTo(radius * 1.9, 0);
    ctx.stroke();
    ctx.fillStyle = '#e8f7ff';
    ctx.beginPath();
    ctx.moveTo(radius * 0.15, -radius * 0.28);
    ctx.lineTo(radius * 1.45, 0);
    ctx.lineTo(radius * 0.15, radius * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:prism-slug:muzzle', { position, rotation, color }),
  onHit: ({ effects: engine, position, rotation }) => engine.spawn('module:prism-slug:impact-clamp', { position, rotation, color }),
  onTrail: ({ effects: engine, position, rotation }) => engine.spawn('module:prism-slug:trail', { position, rotation, color }),
};
