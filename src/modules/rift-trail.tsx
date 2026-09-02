import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';
import {
  createRiftCrossEffect,
  extendSpatialRift,
  RIFT_SPACE_COLOR,
  RIFT_SPACE_CONTACT,
  RIFT_SPACE_RETENTION,
  RIFT_SPACE_TINT,
} from './rift-space';

const RiftTrailIcon = createModuleIcon(<>
  <path className="module-icon__fill" d="M5 4l6 5-3 4 6 3-4 5 6 7 4-7-2-5 6-4-3-4 6-4-9 2-5-4-3 4z" />
  <path className="module-icon__cut" d="M13 5l2 6-3 4 5 3-2 7" />
</>);

const hitEffectId = 'module:rift-trail:cross';
const stats = {
  jitter: 0.75,
  damageMultiplierPerSecond: 2.5,
} as const;

const effects = [createRiftCrossEffect(hitEffectId)] as const;

export const riftTrailModule: ModuleDefinition = {
  id: 'rift-trail',
  kind: 'trail',
  tags: ['trail', 'rift-space'],
  icon: RiftTrailIcon,
  meta: {
    color: RIFT_SPACE_COLOR, tint: RIFT_SPACE_TINT, energy: 82, rarity: 'legendary',
    text: { detail: {
      damage: stats.damageMultiplierPerSecond,
      width: RIFT_SPACE_CONTACT.width,
      duration: RIFT_SPACE_RETENTION,
    } },
  },
  effects,
  compile: (context) => context.modifyNext({}),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.globalAlpha = 0.46;
    ctx.strokeStyle = RIFT_SPACE_COLOR;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 5, -projectile.age * 2.3, -projectile.age * 2.3 + Math.PI);
    ctx.stroke();
    ctx.restore();
  },
  onTrail: ({ position, projectile, combat }) => {
    if (!projectile) return;
    const updateKey = 'rift-trail:last-age';
    if (projectile.moduleState[updateKey] === projectile.age) return;
    projectile.moduleState[updateKey] = projectile.age;
    const stacks = projectile.modules.filter((id) => id === 'rift-trail').length;
    const damagePerSecond = projectile.damage * stats.damageMultiplierPerSecond * stacks;
    extendSpatialRift(combat, projectile, 'rift-trail', position, {
      duration: RIFT_SPACE_RETENTION,
      damagePerSecond,
      jitter: stats.jitter,
      hitEffectId,
    });
  },
};
