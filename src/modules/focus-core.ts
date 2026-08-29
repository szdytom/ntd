import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#e63973';
const stats = { damagePerCharge: 0.55, speedPerCharge: 0.12, projectileCount: 1 } as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:focus-core:charge',
    lifetime: 0.42,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      const radius = 48 * (1 - frame.easeOut(3)) + 7;
      painter.ring(frame.x, frame.y, radius, 3.4 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 6; index += 1) {
        const angle = frame.rotation + index * Math.PI / 3;
        painter.lineAngle(
          frame.x + Math.cos(angle) * radius,
          frame.y + Math.sin(angle) * radius,
          angle + Math.PI,
          18 * frame.fout,
          2 * frame.fout,
          index % 2 ? '#ffffff' : frame.color,
          frame.fout,
        );
      }
    },
  },
];

export const focusCoreModule: ModuleDefinition = {
  id: 'focus-core',
  kind: 'modifier',
  meta: {
    name: 'Focus Core', shortName: 'Focus', symbol: '⌁', color, tint: '#ffe6ef', energy: 16, rarity: 'rare',
    text: {
      description: { count: stats.projectileCount },
      detail: {
        damage: Math.round(stats.damagePerCharge * 100),
        speed: Math.round(stats.speedPerCharge * 100),
      },
    },
  },
  effects,
  compile: (context) => context.modifyNext({
    focusConversion: { damagePerCharge: stats.damagePerCharge, speedPerCharge: stats.speedPerCharge },
  }),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:focus-core:charge', { position, rotation, color }),
};
