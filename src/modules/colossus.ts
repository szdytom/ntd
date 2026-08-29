import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#ff7b00';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:colossus:charge',
    lifetime: 0.42,
    layer: 'air',
    render: (frame, painter) => {
      painter.light(frame.x, frame.y, 65 * frame.fout, frame.color, frame.slope * 0.35);
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4 + frame.rotation;
        const radius = 48 * frame.fout + 5;
        const x = frame.x + Math.cos(angle) * radius;
        const y = frame.y + Math.sin(angle) * radius;
        painter.triangle(x, y, 7 * frame.slope, 18 * frame.slope, angle + Math.PI, index % 2 ? '#fff' : frame.color, frame.fout);
      }
      painter.ring(frame.x, frame.y, 9 + frame.easeOut(3) * 42, 4 * frame.fout, frame.color, frame.fout);
    },
  },
];

export const colossusModule: ModuleDefinition = {
  id: 'colossus',
  kind: 'modifier',
  meta: {
    name: 'Colossus Core', shortName: 'Colossus', symbol: '⬡', color, tint: '#fff0df', energy: 22, rarity: 'rare',
    description: 'Enlarges the next projectile', detail: '+55% damage · +75% size · +32 blast radius',
  },
  effects,
  compile: (context) => context.modifyNext({
    damageMultiplier: 1.55,
    speedMultiplier: 0.8,
    sizeMultiplier: 1.75,
    splashBonus: 32,
  }),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:colossus:charge', { position, rotation, color }),
};
