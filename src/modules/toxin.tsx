import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { createDamageStatusModifier } from './damage-status';
import { createModuleIcon } from './icons';

const ToxinIcon = createModuleIcon(<>
  <circle className="module-icon__line" cx="16" cy="16" r="5" />
  <circle className="module-icon__fill" cx="16" cy="16" r="2" />
  <circle className="module-icon__line" cx="8" cy="8" r="3" />
  <circle className="module-icon__line" cx="25" cy="10" r="3" />
  <circle className="module-icon__line" cx="9" cy="25" r="3" />
  <path className="module-icon__thin" d="M11 11l2 2M21 12l-2 2M12 21l2-2" />
</>);

const color = '#70e000';
const stats = { damageMultiplier: 0.9, damage: 3, duration: 3, interval: 0.5 } as const;

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

export const toxinModule = createDamageStatusModifier({
  id: 'toxin',
  icon: ToxinIcon,
  color,
  tint: '#efffdf',
  energy: 10,
  rarity: 'uncommon',
  stats,
  effects,
  hitEffectIds: ['module:toxin:infect', 'module:toxin:drops'],
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
  onTrail: ({ effects, position, projectile }) => {
    if (!projectile) return;
    const count = ((projectile.moduleState['toxin:trail'] as number | undefined) ?? 0) + 1;
    projectile.moduleState['toxin:trail'] = count;
    if (count % 3 === 0) effects.spawn('module:toxin:trail', { position, color });
  },
});
