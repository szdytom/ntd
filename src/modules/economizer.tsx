import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const EconomizerIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M6 12a11 11 0 0 1 18-5l3 3M26 20a11 11 0 0 1-18 5l-3-3" />
  <path className="module-icon__fill" d="M21 10h6V4zM11 22H5v6z" />
  <path className="module-icon__line" d="M17 9l-5 8h5l-2 6 6-9h-5z" />
</>);

const color = '#06d6a0';
const stats = { damageMultiplier: 0.78, energyMultiplier: 0.62 } as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:economizer:recycle',
    lifetime: 0.36,
    layer: 'ground',
    render: (frame, painter) => {
      const radius = 17 + frame.easeOut(2) * 15;
      for (let index = 0; index < 3; index += 1) {
        const angle = frame.rotation + index * Math.PI * 2 / 3 + frame.fin * 1.5;
        const x = frame.x + Math.cos(angle) * radius;
        const y = frame.y + Math.sin(angle) * radius;
        painter.triangle(x, y, 6 * frame.fout, 13 * frame.fout, angle + Math.PI / 2, index === 1 ? '#fff' : frame.color, frame.fout);
      }
      painter.ring(frame.x, frame.y, radius, 1.8 * frame.fout, frame.color, frame.fout * 0.6);
    },
  },
];

export const economizerModule: ModuleDefinition = {
  id: 'economizer',
  kind: 'logic',
  tags: [],
  icon: EconomizerIcon,
  meta: {
    color, tint: '#e3fff7', energy: 3, rarity: 'uncommon',
    text: { detail: {
      energy: Math.round((1 - stats.energyMultiplier) * 100),
      damage: Math.round((1 - stats.damageMultiplier) * 100),
    } },
  },
  effects,
  compile: (context) => context.modifyNext(stats),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:economizer:recycle', { position, rotation, color }),
};
