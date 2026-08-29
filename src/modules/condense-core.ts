import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#d1495b';
const stats = { damagePerRadius: 0.015, splash: 0 } as const;

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

export const condenseCoreModule: ModuleDefinition = {
  id: 'condense-core',
  kind: 'modifier',
  meta: {
    name: 'Condense Core', shortName: 'Condense', symbol: '⊙', color, tint: '#ffe9ec', energy: 17, rarity: 'uncommon',
    text: { detail: { damage: stats.damagePerRadius * 100 } },
  },
  effects,
  compile: (context) => context.modifyNext({
    splashSet: stats.splash,
    condenseSplash: { damagePerRadius: stats.damagePerRadius },
  }),
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
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:condense-core:collapse', { position, rotation, color }),
  onHit: ({ effects: engine, position, rotation }) => engine.spawn('module:condense-core:collapse', { position, rotation, color }),
};
