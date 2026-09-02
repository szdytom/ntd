import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawProjectileGlow } from './render-utils';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const NovaIcon = createModuleIcon(<>
  <path className="module-icon__fill" d="M16 2l3.1 8.9L28 8l-5.9 7.7L30 21l-9.4-.5L19 30l-3-8.9L8 25l3.8-8.6L2 14l9.5-1.7z" />
  <circle className="module-icon__cut-fill" cx="16" cy="16" r="3" />
</>);

const color = '#ff9f43';
const stats = { damage: 24, speed: 350, size: 8, splash: 64 } as const;

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
  tags: ['projectile', 'area'],
  icon: NovaIcon,
  meta: {
    color, tint: '#fff1df', energy: 30, rarity: 'uncommon',
    text: { detail: { damage: stats.damage, radius: stats.splash } },
  },
  effects,
  compile: (context) => context.emitProjectile(stats),
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
