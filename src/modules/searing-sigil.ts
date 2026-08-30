import type { EffectDefinition } from '../effects/types';
import { statusOrbs } from '../effects/factories';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';

const color = '#ff3d00';
const brightColor = '#ffcc55';
const darkColor = '#8f1d00';
const smokeColor = '#4a3033';
const burningEffectId = 'module:searing-sigil:burning';
const stats = { damageMultiplier: 0.82, damage: 5, duration: 3, interval: 0.5 } as const;

const effects: readonly EffectDefinition[] = [
  statusOrbs({ id: burningEffectId, lifetime: 0.52, size: 4.1, hotColor: brightColor, bloom: 0.88 }),
  {
    id: 'module:searing-sigil:brand',
    lifetime: 0.62,
    layer: 'air',
    bloom: 0.95,
    render: (frame, painter) => {
      const flash = Math.max(0, 1 - frame.fin / 0.52);
      const outerRadius = 7 + frame.easeOut(3) * 48;
      painter.ring(frame.x, frame.y, outerRadius, 4.6 * flash + 0.45, color, 0.26 + flash * 0.74);
      painter.ring(frame.x, frame.y, outerRadius * 0.72, 2.3 * frame.fout + 0.4, darkColor, frame.fout * 0.72);
      painter.polygon(frame.x, frame.y, 37 - frame.easeOut(3) * 24, 8, frame.rotation - frame.fin * 0.9, darkColor, frame.fout * 0.9, 3 * frame.fout + 0.35);
      for (let index = 0; index < 8; index += 1) {
        const angle = frame.rotation + index * Math.PI / 4;
        const rayLength = 17 + 34 * flash;
        painter.triangle(
          frame.x + Math.cos(angle) * (10 + frame.easeOut(3) * 19),
          frame.y + Math.sin(angle) * (10 + frame.easeOut(3) * 19),
          5 * frame.fout + 0.5,
          rayLength * frame.fout,
          angle,
          index % 3 === 0 ? brightColor : index % 2 === 0 ? color : darkColor,
          frame.fout * 0.92,
        );
      }
      painter.light(frame.x, frame.y, 68 * frame.fout, frame.color, frame.slope * 0.55);
      painter.circle(frame.x, frame.y, 10 * flash + 1, color, flash * 0.86);
      painter.circle(frame.x, frame.y, 5.5 * flash, '#ffffff', flash);
    },
  },
  {
    id: 'module:searing-sigil:flare',
    lifetime: 0.72,
    layer: 'air',
    bloom: 0.85,
    render: (frame, painter) => {
      for (let index = 0; index < 16; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        const travel = 3 + frame.easeOut(3) * frame.random(index + 30, 30, 57);
        const x = frame.x + Math.cos(angle) * travel;
        const y = frame.y + Math.sin(angle) * travel - frame.fin * frame.random(index + 50, 0, 9);
        if (index % 3 === 0) {
          painter.circle(
            x,
            y,
            1 + frame.slope * frame.random(index + 70, 3.5, 6),
            frame.fin < 0.52 ? darkColor : smokeColor,
            frame.fout * 0.74,
          );
        } else {
          const particleColor = frame.fin < 0.16 ? brightColor : frame.fin < 0.6 ? color : darkColor;
          painter.lineAngle(
            x,
            y,
            angle,
            frame.random(index + 90, 7, 16) * frame.fout + 2,
            2.6 * frame.fout + 0.4,
            particleColor,
            frame.fout,
          );
        }
      }
    },
  },
];

export const searingSigilModule: ModuleDefinition = {
  id: 'searing-sigil',
  kind: 'modifier',
  meta: {
    name: 'Searing Sigil', shortName: 'Searing', symbol: '✷', color, tint: '#ffe8e0', energy: 18, rarity: 'rare',
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
        engine.spawnMany(['module:searing-sigil:brand', 'module:searing-sigil:flare'], { position, color });
        return;
      }
      if (!enemy) return;
      const entered = combat.applyStatus(enemy, {
        id: 'searing-sigil', duration: stats.duration, interval: stats.interval, damage: stats.damage, color,
        particle: { effectId: burningEffectId, interval: 0.34 },
      });
      if (entered && projectile?.behavior === 'static') {
        engine.spawnMany(['module:searing-sigil:brand', 'module:searing-sigil:flare'], { position, color });
      }
    },
  },
  renderProjectile: ({ ctx, projectile }) => {
    const phase = projectile.life * 3.5 + projectile.id * 0.7;
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 16, color, 0.72);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.74;
    for (const direction of [-1, 1]) {
      ctx.save();
      ctx.rotate(phase * direction);
      ctx.strokeRect(-projectile.radius - 3, -projectile.radius - 3, (projectile.radius + 3) * 2, (projectile.radius + 3) * 2);
      ctx.restore();
    }
    ctx.fillStyle = brightColor;
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  onHit: ({ effects: engine, position }) => {
    engine.spawnMany(['module:searing-sigil:brand', 'module:searing-sigil:flare'], { position, color });
  },
};
