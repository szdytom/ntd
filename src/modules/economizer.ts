import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#06d6a0';

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
  meta: {
    name: '节能回路', shortName: '节能', symbol: '♻', color, tint: '#e3fff7', energy: 3, rarity: 'common',
    description: '降低下一段施法的总耗能', detail: '-38% 能耗 · -22% 伤害',
  },
  effects,
  compile: (context) => context.modifyNext({ damageMultiplier: 0.78, energyMultiplier: 0.62 }),
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
