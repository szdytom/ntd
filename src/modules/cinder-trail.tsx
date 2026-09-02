import { fireParticles, statusOrbs } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';
import { extendStatusTrail } from './status-trail';

const CinderTrailIcon = createModuleIcon(<>
  <path className="module-icon__line" d="M22 5l7 11-7 11-4-7H9l3-4-3-4h9z" />
  <path className="module-icon__fill" d="M18 10l5 6-5 6-2-4h-5l2-2-2-2h5z" />
  <circle className="module-icon__fill" cx="6" cy="9" r="2" />
  <circle className="module-icon__fill" cx="4" cy="17" r="1.5" />
  <circle className="module-icon__fill" cx="7" cy="24" r="2.2" />
</>);

const color = '#ff6b1a';
const brightColor = '#ffd166';
const darkColor = '#9f2d0f';
const smokeColor = '#4f3b40';
const burningEffectId = 'module:cinder-trail:burning';
const stats = {
  damageMultiplierPerSecond: 0.25,
  width: 32,
  duration: 1.5,
  settlementInterval: 0.25,
  burnDamage: 3,
  burnDuration: 1.5,
  burnInterval: 0.5,
} as const;

const effects: readonly EffectDefinition[] = [
  statusOrbs({ id: burningEffectId, lifetime: 0.52, size: 3.5, hotColor: brightColor, bloom: 0.82 }),
  fireParticles({
    id: 'module:cinder-trail:embers',
    lifetime: stats.duration,
    count: 7,
    distanceMin: 7,
    distanceMax: stats.width / 2,
    liftMin: 4,
    liftMax: 16,
    sizeMin: 2.4,
    sizeMax: 5.8,
    hotColor: brightColor,
    emberColor: darkColor,
    smokeColor,
    hotTimeMin: 0.48,
    hotTimeMax: 0.74,
    bloom: 0.62,
  }),
  {
    id: 'module:cinder-trail:contact',
    lifetime: 0.28,
    layer: 'air',
    bloom: 0.72,
    render: (frame, painter) => {
      painter.light(frame.x, frame.y, 30 * frame.fout, frame.color, frame.slope * 0.3);
      painter.circle(frame.x, frame.y, 4.5 * frame.fout, brightColor, frame.fout * 0.78);
      for (let index = 0; index < 4; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        painter.lineAngle(
          frame.x,
          frame.y,
          angle,
          frame.random(index + 10, 6, 15) * frame.slope,
          1.5 * frame.fout + 0.3,
          index === 0 ? '#ffffff' : frame.color,
          frame.fout,
        );
      }
    },
  },
];

export const cinderTrailModule: ModuleDefinition = {
  id: 'cinder-trail',
  kind: 'trail',
  tags: ['trail', 'area', 'status'],
  icon: CinderTrailIcon,
  meta: {
    color, tint: '#fff0e6', energy: 28, rarity: 'uncommon',
    text: { detail: {
      damage: Math.round(stats.damageMultiplierPerSecond * 100),
      width: stats.width,
      duration: stats.duration,
      burnDamage: stats.burnDamage,
      burnTicks: stats.burnDuration / stats.burnInterval,
    } },
  },
  effects,
  compile: (context) => context.modifyNext({}),
  renderProjectile: ({ ctx, projectile }) => {
    const phase = projectile.age * 5.2 + projectile.id * 0.31;
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 11, color, 0.42);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.globalAlpha = 0.68;
    ctx.beginPath();
    ctx.arc(
      projectile.position.x,
      projectile.position.y,
      projectile.radius + 4,
      phase + Math.PI * 0.35,
      phase + Math.PI * 1.65,
    );
    ctx.stroke();
    ctx.fillStyle = brightColor;
    for (let index = 0; index < 2; index += 1) {
      const offset = index * Math.PI;
      ctx.beginPath();
      ctx.arc(
        projectile.position.x + Math.cos(phase + offset) * (projectile.radius + 4),
        projectile.position.y + Math.sin(phase + offset) * (projectile.radius + 4),
        1.7,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  },
  onTrail: ({ effects: engine, position, rotation, projectile, combat }) => {
    if (!projectile) return;
    const extended = extendStatusTrail(combat, projectile, position, {
      moduleId: 'cinder-trail',
      duration: stats.duration,
      width: stats.width,
      damageMultiplierPerSecond: stats.damageMultiplierPerSecond,
      settlementInterval: stats.settlementInterval,
      color,
      statusDuration: stats.burnDuration,
      statusInterval: stats.burnInterval,
      statusDamage: stats.burnDamage,
      statusColor: darkColor,
      statusEffectId: burningEffectId,
      statusParticleInterval: 0.4,
      hitEffectId: 'module:cinder-trail:contact',
    });
    if (!extended) return;
    engine.spawn('module:cinder-trail:embers', { position, rotation, color });
  },
};
