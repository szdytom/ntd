import type { EffectDefinition } from '../effects/types';
import { statusOrbs } from '../effects/factories';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';

const color = '#ff8a3d';
const brightColor = '#ffd166';
const darkColor = '#9a3412';
const smokeColor = '#554047';
const burningEffectId = 'module:ember-coating:burning';
const stats = { damageMultiplier: 0.96, damage: 2, duration: 2.5, interval: 0.5 } as const;

const effects: readonly EffectDefinition[] = [
  statusOrbs({ id: burningEffectId, size: 3.2, hotColor: brightColor, bloom: 0.72 }),
  {
    id: 'module:ember-coating:ignite',
    lifetime: 0.48,
    layer: 'air',
    bloom: 0.75,
    render: (frame, painter) => {
      const flash = Math.max(0, 1 - frame.fin / 0.55);
      const ringRadius = 5 + frame.easeOut(3) * 34;
      painter.ring(frame.x, frame.y, ringRadius, 3.8 * flash + 0.45, color, 0.28 + flash * 0.72);
      painter.ring(frame.x, frame.y, ringRadius * 0.72, 1.8 * frame.fout + 0.35, darkColor, frame.fout * 0.62);
      painter.light(frame.x, frame.y, 46 * frame.fout, frame.color, frame.slope * 0.5);
      painter.circle(frame.x, frame.y, 8 * flash + 1, color, flash * 0.82);
      painter.circle(frame.x, frame.y, 4.5 * flash, '#ffffff', flash);
      for (let index = 0; index < 10; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        const speed = frame.random(index + 20, 0.62, 1);
        const travel = 4 + frame.easeOut(3) * 43 * speed;
        const particleColor = frame.fin < 0.18 ? brightColor : frame.fin < 0.58 ? color : darkColor;
        painter.circle(
          frame.x + Math.cos(angle) * travel,
          frame.y + Math.sin(angle) * travel,
          (1.2 + frame.random(index + 40, 2.2, 4.2) * frame.fout) * speed,
          particleColor,
          frame.fout,
        );
        if (index % 3 === 0) {
          painter.lineAngle(
            frame.x + Math.cos(angle) * travel,
            frame.y + Math.sin(angle) * travel,
            angle,
            3 + 8 * frame.fout,
            1.7 * frame.fout + 0.35,
            index % 2 === 0 ? brightColor : darkColor,
            frame.fout * 0.9,
          );
        }
      }
    },
  },
  {
    id: 'module:ember-coating:cinders',
    lifetime: 0.62,
    layer: 'air',
    bloom: 0.5,
    render: (frame, painter) => {
      for (let index = 0; index < 7; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        const travel = 5 + frame.easeOut(2) * frame.random(index + 20, 13, 31);
        const lift = frame.fin * frame.random(index + 40, 5, 13);
        const hot = Math.max(0, 1 - frame.fin / 0.62);
        painter.circle(
          frame.x + Math.cos(angle) * travel,
          frame.y + Math.sin(angle) * travel - lift,
          1.5 + frame.slope * frame.random(index + 60, 3, 5.8),
          hot > 0 ? index % 3 === 0 ? color : darkColor : smokeColor,
          frame.fout * (0.58 + hot * 0.35),
        );
      }
    },
  },
];

export const emberCoatingModule: ModuleDefinition = {
  id: 'ember-coating',
  kind: 'modifier',
  meta: {
    name: 'Ember Coating', shortName: 'Ember', symbol: '✶', color, tint: '#fff0e6', energy: 6, rarity: 'common',
    text: { detail: {
      direct: Math.round((1 - stats.damageMultiplier) * 100),
      damage: stats.damage,
      ticks: stats.duration / stats.interval,
      duration: stats.duration,
    } },
  },
  effects,
  compile: (context) => context.modifyNext({ damageMultiplier: stats.damageMultiplier }),
  targetEffect: {
    channels: ['damage', 'secondary-hit'],
    apply: ({ effects: engine, position, enemy, projectile, targetEffectChannel, combat }) => {
      if (targetEffectChannel === 'secondary-hit') {
        engine.spawnMany(['module:ember-coating:ignite', 'module:ember-coating:cinders'], { position, color });
        return;
      }
      if (!enemy) return;
      const entered = combat.applyStatus(enemy, {
        id: 'ember-coating', duration: stats.duration, interval: stats.interval, damage: stats.damage, color,
        particle: { effectId: burningEffectId, interval: 0.4 },
      });
      if (entered && projectile?.behavior === 'static') {
        engine.spawnMany(['module:ember-coating:ignite', 'module:ember-coating:cinders'], { position, color });
      }
    },
  },
  renderProjectile: ({ ctx, projectile }) => {
    const phase = projectile.life * 4 + projectile.id;
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 12, color, 0.58);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.68;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 4, phase, phase + Math.PI * 1.45);
    ctx.stroke();
    ctx.fillStyle = brightColor;
    for (const offset of [0, Math.PI]) {
      ctx.beginPath();
      ctx.arc(
        projectile.position.x + Math.cos(phase + offset) * (projectile.radius + 4),
        projectile.position.y + Math.sin(phase + offset) * (projectile.radius + 4),
        1.8,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  },
  onHit: ({ effects: engine, position }) => {
    engine.spawnMany(['module:ember-coating:ignite', 'module:ember-coating:cinders'], { position, color });
  },
};
