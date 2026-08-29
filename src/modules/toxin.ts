import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#70e000';

const effects: readonly EffectDefinition[] = [
  shockwave({ id: 'module:toxin:infect', lifetime: 0.42, radius: 34, stroke: 2, sides: 6 }),
  coneSparks({ id: 'module:toxin:drops', lifetime: 0.46, count: 7, distance: 38, length: 6, stroke: 2 }),
  {
    id: 'module:toxin:trail',
    lifetime: 0.42,
    layer: 'under-projectile',
    render: (frame, painter) => {
      const angle = frame.random(1, 0, Math.PI * 2);
      const travel = frame.easeOut(2) * frame.random(2, 5, 15);
      painter.circle(frame.x + Math.cos(angle) * travel, frame.y + Math.sin(angle) * travel, 3.5 * frame.fout, frame.color, frame.fout * 0.65);
    },
  },
];

export const toxinModule: ModuleDefinition = {
  id: 'toxin',
  kind: 'modifier',
  meta: {
    name: 'Corrosive Spore', shortName: 'Corrosion', symbol: '♧', color, tint: '#efffdf', energy: 10, rarity: 'uncommon',
    description: 'Adds refreshable damage over time', detail: '3×6 corrosion damage · Lasts 3 seconds',
  },
  effects,
  compile: (context) => context.modifyNext({ damageMultiplier: 0.9 }),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    for (let index = 0; index < 3; index += 1) {
      const angle = projectile.id + projectile.life * 2 + index * Math.PI * 2 / 3;
      ctx.beginPath();
      ctx.arc(projectile.position.x + Math.cos(angle) * (projectile.radius + 3), projectile.position.y + Math.sin(angle) * (projectile.radius + 3), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  onTrail: ({ effects: engine, position, projectile }) => {
    if (!projectile) return;
    const count = ((projectile.moduleState['toxin:trail'] as number | undefined) ?? 0) + 1;
    projectile.moduleState['toxin:trail'] = count;
    if (count % 3 === 0) engine.spawn('module:toxin:trail', { position, color });
  },
  onHit: ({ effects: engine, position, enemy, combat }) => {
    engine.spawnMany(['module:toxin:infect', 'module:toxin:drops'], { position, color });
    if (!enemy) return;
    combat.applyStatus(enemy, {
      id: 'toxin', duration: 3, interval: 0.5, damage: 3, color,
    });
  },
};
