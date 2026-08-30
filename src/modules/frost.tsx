import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const FrostIcon = createModuleIcon(<>
  <circle className="module-icon__line" cx="16" cy="16" r="7" />
  <path className="module-icon__thin" d="M16 2v28M4 9l24 14M4 23L28 9M16 2l-3 4m3-4l3 4M4 9l5 1M4 23l5-1M28 9l-5 1M28 23l-5-1M16 30l-3-4m3 4l3-4" />
</>);

const color = '#00a8e8';
const stats = { slow: 0.3, duration: 1.6 } as const;

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
  tags: ['status'],
  icon: FrostIcon,
  meta: {
    name: 'Condensing Lens', shortName: 'Frost', color, tint: '#e4f7ff', energy: 5, rarity: 'common',
    text: { detail: { slow: Math.round(stats.slow * 100), duration: stats.duration } },
  },
  effects,
  compile: (context) => context.modifyNext({ slow: stats.slow, slowDuration: stats.duration }),
  targetEffect: {
    channels: ['damage', 'static', 'secondary-hit'],
    apply: ({ effects: engine, position, enemy, projectile, shot, targetEffectChannel, combat }) => {
      if (targetEffectChannel === 'secondary-hit') {
        engine.spawnMany(['module:frost:hit-ring', 'module:frost:shards'], { position, color });
        return;
      }
      if (enemy && combat.applySlow(enemy, shot.slow, shot.slowDuration) && projectile?.behavior === 'static') {
        engine.spawnMany(['module:frost:hit-ring', 'module:frost:shards'], { position, color });
      }
    },
  },
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
  onHit: ({ effects: engine, position }) => {
    engine.spawnMany(['module:frost:hit-ring', 'module:frost:shards'], { position, color });
  },
  onTrail: ({ effects: engine, position }) => engine.spawn('module:frost:trail', { position, color }),
};
