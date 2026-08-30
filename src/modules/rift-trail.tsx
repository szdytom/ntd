import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const RiftTrailIcon = createModuleIcon(<>
  <path className="module-icon__fill" d="M5 4l6 5-3 4 6 3-4 5 6 7 4-7-2-5 6-4-3-4 6-4-9 2-5-4-3 4z" />
  <path className="module-icon__cut" d="M13 5l2 6-3 4 5 3-2 7" />
</>);

const color = '#7c3fc2';
const stats = {
  duration: 2.5,
  width: 18,
  jitter: 0.75,
  damageMultiplierPerSecond: 2.5,
  settlementInterval: 0.25,
  modifierInterval: 0.25,
  effectInterval: 0.25,
} as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:rift-trail:cross',
    lifetime: 0.36,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      painter.light(frame.x, frame.y, 42 * frame.slope, frame.color, 0.28 * frame.fout);
      painter.ring(frame.x, frame.y, 4 + frame.easeOut(3) * 25, 2.4 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 6; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        painter.lineAngle(frame.x, frame.y, angle, frame.random(index + 8, 7, 24) * frame.slope, 1.4 * frame.fout, index % 2 ? '#cbb8ff' : frame.color, frame.fout);
      }
    },
  },
];

export const riftTrailModule: ModuleDefinition = {
  id: 'rift-trail',
  kind: 'trail',
  tags: ['trail', 'rift-space'],
  icon: RiftTrailIcon,
  meta: {
    name: 'Riftwake', shortName: 'Riftwake', color, tint: '#f1e7fa', energy: 82, rarity: 'legendary',
    text: { detail: {
      damage: stats.damageMultiplierPerSecond,
      width: stats.width,
      duration: stats.duration,
    } },
  },
  effects,
  compile: (context) => context.modifyNext({}),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.globalAlpha = 0.46;
    ctx.strokeStyle = color;
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
    combat.extendRift(projectile, 'rift-trail', position, {
      duration: stats.duration,
      width: stats.width,
      damagePerSecond,
      settlementInterval: stats.settlementInterval,
      modifierInterval: stats.modifierInterval,
      effectInterval: stats.effectInterval,
      color,
      jitter: stats.jitter,
      hitEffectId: 'module:rift-trail:cross',
    });
  },
};
