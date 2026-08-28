import { coneSparks } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { projectileAngle } from './render-utils';
import type { ModuleDefinition } from './types';

const color = '#00b4d8';

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
  meta: {
    name: '回旋刃片', shortName: '刃片', symbol: '✥', color, tint: '#e3f8fc', energy: 34, rarity: 'rare',
    description: '宽大的多目标切割弹体', detail: '14 伤害 · 最多命中 5 个目标',
  },
  effects,
  compile: (context) => context.emitProjectile({ damage: 14, speed: 400, size: 8, pierce: 4, lifetime: 2 }),
  renderProjectile: ({ ctx, projectile }) => {
    const angle = projectileAngle(projectile.velocity) + projectile.life * 8;
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(angle);
    ctx.shadowColor = color;
    ctx.shadowBlur = 9;
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
