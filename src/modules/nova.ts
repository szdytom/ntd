import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawProjectileGlow } from './render-utils';
import type { ModuleDefinition } from './types';

const color = '#ff9f43';

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:nova:muzzle',
    lifetime: 0.28,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      painter.light(frame.x, frame.y, 55 * frame.fout, frame.color, 0.4 * frame.fout);
      painter.polygon(frame.x, frame.y, 6 + frame.easeOut(3) * 25, 8, frame.fin * 0.8, frame.color, frame.fout, 3 * frame.fout);
      for (let index = 0; index < 4; index += 1) {
        const angle = frame.rotation + (index - 1.5) * 0.18;
        painter.triangle(frame.x, frame.y, 8 * frame.fout, 31 * frame.fout, angle, index % 2 ? '#ffffff' : frame.color, frame.fout);
      }
    },
  },
  shockwave({ id: 'module:nova:blast-a', lifetime: 0.48, radius: 68, stroke: 4, bloom: 1 }),
  shockwave({ id: 'module:nova:blast-b', lifetime: 0.34, radius: 46, stroke: 2.5, sides: 8, bloom: 0.8 }),
  coneSparks({ id: 'module:nova:debris', lifetime: 0.58, count: 18, distance: 84, length: 16, stroke: 2.4, bloom: 1 }),
];

export const novaModule: ModuleDefinition = {
  id: 'nova',
  kind: 'projectile',
  meta: {
    name: 'Micro Nova', shortName: 'Nova', symbol: '✦', color, tint: '#fff1df', energy: 30, rarity: 'uncommon',
    description: 'Creates an area explosion on impact', detail: '24 damage · 64 radius',
  },
  effects,
  compile: (context) => context.emitProjectile({ damage: 24, speed: 350, size: 8, splash: 64 }),
  renderProjectile: ({ ctx, projectile }) => {
    drawProjectileGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius, color);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(projectile.life * 2.4);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-4, -4, 8, 8);
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:nova:muzzle', { position, rotation, color }),
  onHit: ({ effects: engine, position, projectile }) => {
    if (projectile?.splash === 0) return;
    engine.spawnMany(['module:nova:blast-a', 'module:nova:blast-b', 'module:nova:debris'], { position, color });
  },
};
