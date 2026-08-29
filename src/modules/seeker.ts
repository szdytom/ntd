import { coneSparks } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#168aad';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:seeker:lock',
    lifetime: 0.34,
    layer: 'air',
    render: (frame, painter) => {
      const radius = 27 - frame.easeOut(2) * 16;
      painter.ring(frame.x, frame.y, radius, 2 * frame.slope + 0.3, frame.color, frame.fout);
      for (let index = 0; index < 4; index += 1) {
        const angle = index * Math.PI / 2 + frame.rotation;
        const x = frame.x + Math.cos(angle) * radius;
        const y = frame.y + Math.sin(angle) * radius;
        painter.lineAngle(x, y, angle + Math.PI, 6, 2 * frame.fout, index % 2 ? '#fff' : frame.color, frame.fout);
      }
    },
  },
  coneSparks({ id: 'module:seeker:hit', lifetime: 0.3, count: 8, distance: 36, cone: 0.7, length: 9, stroke: 1.5 }),
];

export const seekerModule: ModuleDefinition = {
  id: 'seeker',
  kind: 'logic',
  meta: {
    name: 'Seeker Protocol', shortName: 'Seeker', symbol: '⌁', color, tint: '#e2f4f8', energy: 10, rarity: 'uncommon',
    description: 'Makes the next projectile track its target', detail: 'Strong guidance · No direct damage bonus',
  },
  effects,
  compile: (context) => context.modifyNext({ seeking: 8 }),
  renderProjectile: ({ ctx, projectile }) => {
    const phase = projectile.life * 7 + projectile.id;
    ctx.save();
    ctx.fillStyle = color;
    for (const offset of [0, Math.PI]) {
      ctx.beginPath();
      ctx.arc(
        projectile.position.x + Math.cos(phase + offset) * (projectile.radius + 5),
        projectile.position.y + Math.sin(phase + offset) * (projectile.radius + 5),
        1.7,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:seeker:lock', { position, rotation, color }),
  onHit: ({ effects: engine, position, rotation }) => engine.spawn('module:seeker:hit', { position, rotation, color }),
};
