import { fireParticles, statusOrbs } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import { createModuleIcon } from './icons';
import {
  starfallParticles,
  STARFIRE_ACCENT as accent,
  STARFIRE_COLOR as color,
  STARFIRE_HOT_COLOR as hotColor,
  STARFIRE_PLASMA_COLOR as plasmaColor,
  STARFIRE_SMOKE_COLOR as smokeColor,
  STARFIRE_TINT,
} from './starfire-effects';
import { extendStatusTrail } from './status-trail';
import type { ModuleDefinition } from './types';

const StarfireTrailIcon = createModuleIcon(<>
  <circle className="module-icon__line" cx="21" cy="16" r="8" />
  <path className="module-icon__fill" d="M21 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
  <path className="module-icon__thin" d="M3 10h9M2 16h11M4 22h8" />
</>);

const burningEffectId = 'module:starfire-trail:burning';
const stats = {
  damageMultiplierPerSecond: 0.45,
  width: 44,
  duration: 2,
  settlementInterval: 0.25,
  burnDamage: 5,
  burnDuration: 2,
  burnInterval: 0.4,
} as const;

const effects: readonly EffectDefinition[] = [
  statusOrbs({ id: burningEffectId, lifetime: 0.56, size: 4.2, hotColor: accent, bloom: 0.95 }),
  fireParticles({
    id: 'module:starfire-trail:plasma',
    lifetime: stats.duration,
    count: 8,
    distanceMin: 6,
    distanceMax: stats.width / 2,
    liftMin: 3,
    liftMax: 14,
    sizeMin: 2.8,
    sizeMax: 6.4,
    hotColor,
    emberColor: plasmaColor,
    smokeColor,
    hotTimeMin: 0.54,
    hotTimeMax: 0.78,
    bloom: 0.78,
  }),
  starfallParticles({
    id: 'module:starfire-trail:starfall',
    lifetime: stats.duration,
    layer: 'under-projectile',
    count: 6,
    distanceMin: 6,
    distanceMax: stats.width / 2,
    scale: 0.72,
    bloom: 0.92,
  }),
  {
    id: 'module:starfire-trail:contact',
    lifetime: 0.36,
    layer: 'air',
    bloom: 0.92,
    render: (frame, painter) => {
      const radius = 4 + frame.easeOut(3) * 22;
      painter.light(frame.x, frame.y, 42 * frame.fout, frame.color, frame.slope * 0.42);
      painter.polygon(frame.x, frame.y, radius, 5, frame.rotation + frame.fin, plasmaColor, frame.fout, 2.2 * frame.fout + 0.3);
      painter.circle(frame.x, frame.y, 5 * frame.fout, hotColor, frame.fout * 0.9);
      for (let index = 0; index < 5; index += 1) {
        const angle = frame.rotation + index * Math.PI * 2 / 5;
        painter.triangle(
          frame.x + Math.cos(angle) * radius * 0.48,
          frame.y + Math.sin(angle) * radius * 0.48,
          3.5 * frame.fout + 0.3,
          10 * frame.fout + 2,
          angle,
          index % 2 === 0 ? accent : frame.color,
          frame.fout * 0.9,
        );
      }
    },
  },
];

export const starfireTrailModule: ModuleDefinition = {
  id: 'starfire-trail',
  kind: 'trail',
  tags: ['trail', 'area', 'status'],
  icon: StarfireTrailIcon,
  meta: {
    name: 'Starfire Wake', shortName: 'Starfire Wake', color, tint: STARFIRE_TINT, energy: 48, rarity: 'epic',
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
    const phase = projectile.age * 3.6 + projectile.id * 0.37;
    const radius = projectile.radius + 5;
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 19, color, 0.72);
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 9, accent, 0.38);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(phase * 0.28);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.45;
    ctx.globalAlpha = 0.76;
    ctx.beginPath();
    for (let index = 0; index < 10; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const pointRadius = index % 2 === 0 ? radius : radius * 0.48;
      const x = Math.cos(angle) * pointRadius;
      const y = Math.sin(angle) * pointRadius;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = accent;
    for (let index = 0; index < 2; index += 1) {
      const angle = phase + index * Math.PI;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  onTrail: ({ effects: engine, position, rotation, projectile, combat }) => {
    if (!projectile) return;
    const extended = extendStatusTrail(combat, projectile, position, {
      moduleId: 'starfire-trail',
      duration: stats.duration,
      width: stats.width,
      damageMultiplierPerSecond: stats.damageMultiplierPerSecond,
      settlementInterval: stats.settlementInterval,
      color,
      statusDuration: stats.burnDuration,
      statusInterval: stats.burnInterval,
      statusDamage: stats.burnDamage,
      statusColor: plasmaColor,
      statusEffectId: burningEffectId,
      statusParticleInterval: 0.32,
      hitEffectId: 'module:starfire-trail:contact',
    });
    if (!extended) return;
    const visualKey = 'starfire-trail:visual-ticks';
    const visualTicks = ((projectile.moduleState[visualKey] as number | undefined) ?? 0) + 1;
    projectile.moduleState[visualKey] = visualTicks;
    if ((visualTicks - 1) % 2 === 0) {
      engine.spawn('module:starfire-trail:plasma', { position, rotation, color });
    }
    if ((visualTicks - 1) % 4 === 0) {
      engine.spawn('module:starfire-trail:starfall', { position, rotation, color });
    }
  },
};
