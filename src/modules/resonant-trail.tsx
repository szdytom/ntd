import { shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { COMBAT_BALANCE } from '../game/balance';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const ResonantTrailIcon = createModuleIcon(<>
  <circle className="module-icon__fill" cx="27" cy="16" r="3" />
  <path className="module-icon__thick" d="M3 16c4-8 7 8 11 0s7 8 11 0" />
  <path className="module-icon__thin" d="M3 9c4-5 7 5 11 0s7 5 11 0M3 23c4-5 7 5 11 0s7 5 11 0" />
  <circle className="module-icon__line" cx="14" cy="16" r="5" />
</>);

const color = '#9b5de5';
const stats = {
  speedMultiplier: 0.96,
  pulseEveryTicks: 4,
  damageMultiplier: 1.5,
  minimumDamage: 5,
  radius: 56,
} as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:resonant-trail:wake',
    lifetime: 0.34,
    layer: 'under-projectile',
    bloom: 0.8,
    render: (frame, painter) => {
      const width = 4 + frame.easeOut(2) * 22;
      painter.lineAngle(frame.x, frame.y, frame.rotation + Math.PI, 26 * frame.fout, 3.2 * frame.fout, frame.color, frame.fout);
      painter.lineAngle(frame.x, frame.y, frame.rotation + Math.PI + 0.22, width, 1.3 * frame.fout, '#ffffff', frame.fout * 0.72);
      painter.lineAngle(frame.x, frame.y, frame.rotation + Math.PI - 0.22, width, 1.3 * frame.fout, frame.color, frame.fout * 0.8);
    },
  },
  shockwave({
    id: 'module:resonant-trail:pulse',
    lifetime: 0.38,
    radius: 58,
    stroke: 2.6,
    sides: 8,
    layer: 'under-projectile',
    bloom: 0.85,
  }),
];

/**
 * A trail modifier is attached to the next emitted projectile by the compiler.
 * Its behavior is therefore independent from the carrier projectile module.
 */
export const resonantTrailModule: ModuleDefinition = {
  id: 'resonant-trail',
  kind: 'trail',
  tags: ['trail'],
  icon: ResonantTrailIcon,
  meta: {
    name: 'Resonant Trail', shortName: 'Resonance', color, tint: '#f1eaff', energy: 44, rarity: 'epic',
    text: { detail: {
      interval: stats.pulseEveryTicks * COMBAT_BALANCE.projectileTrailInterval,
      damage: Math.round(stats.damageMultiplier * 100),
      radius: stats.radius,
      speed: Math.round((1 - stats.speedMultiplier) * 100),
    } },
  },
  effects,
  compile: (context) => context.modifyNext({ speedMultiplier: stats.speedMultiplier }),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.66;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 4, projectile.age * 5, projectile.age * 5 + Math.PI * 1.35);
    ctx.stroke();
    ctx.restore();
  },
  onTrail: ({ effects: engine, position, rotation, projectile, combat }) => {
    if (!projectile) return;
    engine.spawn('module:resonant-trail:wake', { position, rotation, color });
    const key = 'resonant-trail:ticks';
    const ticks = ((projectile.moduleState[key] as number | undefined) ?? 0) + 1;
    projectile.moduleState[key] = ticks;
    if (ticks % stats.pulseEveryTicks !== 0) return;
    engine.spawn('module:resonant-trail:pulse', { position, color });
    const pulseDamage = Math.max(stats.minimumDamage, Math.round(projectile.damage * stats.damageMultiplier));
    for (const target of combat.nearbyEnemies(position, stats.radius)) {
      combat.dealDamage(target, pulseDamage, color, projectile);
    }
  },
};
