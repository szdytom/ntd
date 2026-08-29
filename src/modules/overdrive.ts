import { coneSparks } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#ff5c5c';
const stats = { damageMultiplier: 1.5, speedMultiplier: 1.2 } as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:overdrive:corona',
    lifetime: 0.34,
    layer: 'air',
    render: (frame, painter) => {
      painter.light(frame.x, frame.y, 52 * frame.fout, frame.color, 0.25 * frame.fout);
      for (let index = 0; index < 3; index += 1) {
        painter.polygon(
          frame.x,
          frame.y,
          10 + frame.easeOut(2) * (22 + index * 7),
          3,
          frame.rotation + index * Math.PI * 2 / 3 + frame.fin * 0.4,
          index === 1 ? '#ffffff' : frame.color,
          frame.fout * (0.9 - index * 0.18),
          2.5 * frame.fout,
        );
      }
    },
  },
  coneSparks({ id: 'module:overdrive:impact', lifetime: 0.38, count: 10, distance: 52, length: 12, stroke: 2 }),
];

export const overdriveModule: ModuleDefinition = {
  id: 'overdrive',
  kind: 'modifier',
  meta: {
    name: 'Overdrive Prism', shortName: 'Overdrive', symbol: '▲', color, tint: '#ffebeb', energy: 8, rarity: 'uncommon',
    text: { detail: {
      damage: Math.round((stats.damageMultiplier - 1) * 100),
      speed: Math.round((stats.speedMultiplier - 1) * 100),
    } },
  },
  effects,
  compile: (context) => context.modifyNext(stats),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:overdrive:corona', { position, rotation, color }),
  onHit: ({ effects: engine, position, rotation }) => engine.spawn('module:overdrive:impact', { position, rotation, color }),
};
