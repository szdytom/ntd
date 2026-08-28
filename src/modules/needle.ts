import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { projectileAngle } from './render-utils';
import type { ModuleDefinition } from './types';

const color = '#ff4d8d';

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
  meta: {
    name: '穿刺针', shortName: '穿刺', symbol: '◆', color, tint: '#ffe9f1', energy: 22, rarity: 'uncommon',
    description: '高速穿过多个目标', detail: '14 伤害 · 最多命中 3 个目标',
  },
  effects,
  compile: (context) => context.emitProjectile({ damage: 14, speed: 620, size: 4, pierce: 2 }),
  renderProjectile: ({ ctx, projectile }) => {
    const angle = projectileAngle(projectile.velocity);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(angle);
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
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
