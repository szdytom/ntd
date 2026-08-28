import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawProjectileGlow } from './render-utils';
import type { ModuleDefinition } from './types';

const color = '#6c5ce7';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:pulse:muzzle',
    lifetime: 0.2,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      painter.light(frame.x, frame.y, 40 * frame.fout, frame.color, 0.35 * frame.fout);
      painter.triangle(frame.x, frame.y, 12 * frame.fout + 2, 36 * frame.fout + 4, frame.rotation, '#ffffff', frame.fout);
      painter.triangle(frame.x, frame.y, 8 * frame.fout + 1, 17 * frame.fout + 2, frame.rotation + Math.PI, frame.color, frame.fout);
      painter.ring(frame.x, frame.y, 5 + frame.easeOut(2) * 23, 2.5 * frame.fout, frame.color, frame.fout);
    },
  },
  {
    id: 'module:pulse:trail',
    lifetime: 0.18,
    layer: 'under-projectile',
    bloom: 0.5,
    render: (frame, painter) => {
      painter.circle(frame.x, frame.y, 4.5 * frame.fout, frame.color, frame.fout * 0.3);
      painter.ring(frame.x, frame.y, 2 + frame.fin * 9, 1.4 * frame.fout, frame.color, frame.fout * 0.38);
    },
  },
  shockwave({ id: 'module:pulse:hit-ring', lifetime: 0.3, radius: 28, stroke: 2.5, sides: 6, bloom: 0.78 }),
  coneSparks({ id: 'module:pulse:hit-sparks', lifetime: 0.3, count: 7, distance: 34, length: 8, stroke: 1.7, bloom: 0.9 }),
];

export const pulseModule: ModuleDefinition = {
  id: 'pulse',
  kind: 'projectile',
  meta: {
    name: '脉冲弹', shortName: '脉冲', symbol: '●', color, tint: '#eeeaff', energy: 15, rarity: 'common',
    description: '稳定的基础弹射物', detail: '18 伤害 · 中速 · 单目标',
  },
  effects,
  compile: (context) => context.emitProjectile({ damage: 18, speed: 440, size: 5 }),
  renderProjectile: ({ ctx, projectile }) => {
    drawProjectileGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius, color);
  },
  onCast: ({ effects: engine, position, rotation }) => {
    engine.spawn('module:pulse:muzzle', { position, rotation, color });
  },
  onHit: ({ effects: engine, position }) => {
    engine.spawnMany(['module:pulse:hit-ring', 'module:pulse:hit-sparks'], { position, color });
  },
  onTrail: ({ effects: engine, position }) => {
    engine.spawn('module:pulse:trail', { position, color });
  },
};
