import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#00a8e8';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:frost:trail',
    lifetime: 0.34,
    layer: 'under-projectile',
    render: (frame, painter) => {
      const angle = frame.random(1, 0, Math.PI * 2);
      const radius = frame.easeOut(2) * frame.random(2, 6, 14);
      painter.polygon(frame.x + Math.cos(angle) * radius, frame.y + Math.sin(angle) * radius, 3.5 * frame.fout, 4, angle, frame.color, frame.fout);
    },
  },
  shockwave({ id: 'module:frost:hit-ring', lifetime: 0.4, radius: 42, stroke: 2.5, sides: 6 }),
  coneSparks({ id: 'module:frost:shards', lifetime: 0.52, count: 12, distance: 60, length: 12, stroke: 2 }),
];

export const frostModule: ModuleDefinition = {
  id: 'frost',
  kind: 'modifier',
  meta: {
    name: 'Condensing Lens', shortName: 'Frost', symbol: '✣', color, tint: '#e4f7ff', energy: 5, rarity: 'common',
    description: 'Adds a slow to the next projectile', detail: '30% slow · Lasts 1.6 seconds',
  },
  effects,
  compile: (context) => context.modifyNext({ slow: 0.3, slowDuration: 1.6 }),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 1.4;
    const radius = projectile.radius + 4;
    for (let index = 0; index < 4; index += 1) {
      const angle = projectile.life * 3 + index * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(projectile.position.x + Math.cos(angle) * (radius - 2), projectile.position.y + Math.sin(angle) * (radius - 2));
      ctx.lineTo(projectile.position.x + Math.cos(angle) * (radius + 3), projectile.position.y + Math.sin(angle) * (radius + 3));
      ctx.stroke();
    }
    ctx.restore();
  },
  onTrail: ({ effects: engine, position }) => engine.spawn('module:frost:trail', { position, color }),
  onHit: ({ effects: engine, position }) => engine.spawnMany(['module:frost:hit-ring', 'module:frost:shards'], { position, color }),
};
