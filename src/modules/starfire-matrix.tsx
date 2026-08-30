import type { EffectDefinition } from '../effects/types';
import { statusOrbs } from '../effects/factories';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const StarfireMatrixIcon = createModuleIcon(<>
  <circle className="module-icon__line" cx="16" cy="16" r="10" />
  <path className="module-icon__thin" d="M7 11l18 10M7 21l18-10M16 6v20" />
  <circle className="module-icon__fill" cx="16" cy="6" r="2" />
  <circle className="module-icon__fill" cx="7" cy="21" r="2" />
  <circle className="module-icon__fill" cx="25" cy="21" r="2" />
  <path className="module-icon__fill" d="M16 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
</>);

const color = '#a855f7';
const accent = '#ffd166';
const hotColor = '#fff4c2';
const plasmaColor = '#7c3aed';
const smokeColor = '#352d45';
const burningEffectId = 'module:starfire-matrix:burning';
const stats = { damageMultiplier: 0.78, damage: 7, duration: 3.2, interval: 0.4 } as const;

const effects: readonly EffectDefinition[] = [
  statusOrbs({ id: burningEffectId, lifetime: 0.58, size: 4.8, hotColor: accent, bloom: 1 }),
  {
    id: 'module:starfire-matrix:implant',
    lifetime: 0.82,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      const flash = Math.max(0, 1 - frame.fin / 0.48);
      const ringRadius = 8 + frame.easeOut(3) * 64;
      painter.ring(frame.x, frame.y, ringRadius, 5.4 * flash + 0.55, plasmaColor, 0.25 + flash * 0.75);
      painter.ring(frame.x, frame.y, ringRadius * 0.7, 2.8 * frame.fout + 0.45, accent, frame.fout * 0.72);
      const sides = [5, 8, 12] as const;
      for (const [index, sideCount] of sides.entries()) {
        const radius = 9 + (58 - index * 9) * (1 - frame.easeOut(3));
        const rotation = frame.rotation + frame.fin * (index % 2 === 0 ? 1.1 : -1.25);
        painter.polygon(
          frame.x,
          frame.y,
          radius,
          sideCount,
          rotation,
          index === 1 ? accent : index === 0 ? plasmaColor : frame.color,
          frame.fout * (0.94 - index * 0.1),
          (3.8 - index * 0.6) * frame.fout + 0.35,
        );
      }
      for (let index = 0; index < 6; index += 1) {
        const angle = frame.rotation + index * Math.PI / 3;
        painter.triangle(
          frame.x + Math.cos(angle) * (14 + frame.easeOut(3) * 28),
          frame.y + Math.sin(angle) * (14 + frame.easeOut(3) * 28),
          8 * frame.fout + 0.5,
          (24 + flash * 44) * frame.fout,
          angle,
          index % 3 === 0 ? plasmaColor : index % 2 === 0 ? color : accent,
          frame.fout * 0.94,
        );
      }
      painter.light(frame.x, frame.y, 92 * frame.fout, frame.color, frame.slope * 0.7);
      painter.circle(frame.x, frame.y, 13 * flash + 1, color, flash * 0.88);
      painter.circle(frame.x, frame.y, 7 * flash, hotColor, flash);
    },
  },
  {
    id: 'module:starfire-matrix:starfall',
    lifetime: 0.9,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      for (let index = 0; index < 24; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        const startRadius = frame.random(index + 30, 54, 88);
        const speed = frame.random(index + 60, 0.62, 1);
        const radius = 8 + frame.easeOut(3) * startRadius * speed;
        const x = frame.x + Math.cos(angle) * radius;
        const y = frame.y + Math.sin(angle) * radius - frame.fin * frame.random(index + 90, 0, 12);
        if (index % 4 === 0) {
          painter.circle(
            x,
            y,
            1.5 + frame.slope * frame.random(index + 120, 4, 8),
            frame.fin < 0.54 ? plasmaColor : smokeColor,
            frame.fout * 0.72,
          );
        } else {
          const particleColor = index % 3 === 0 ? plasmaColor : index % 3 === 1 ? accent : frame.color;
          painter.lineAngle(
            x,
            y,
            angle,
            4 + frame.random(index + 150, 10, 24) * frame.fout,
            3.2 * frame.fout + 0.45,
            particleColor,
            frame.fout,
          );
          painter.circle(x, y, 1.7 + 2.8 * frame.fout, particleColor, frame.fout * 0.92);
        }
      }
    },
  },
];

export const starfireMatrixModule: ModuleDefinition = {
  id: 'starfire-matrix',
  kind: 'modifier',
  tags: ['status'],
  icon: StarfireMatrixIcon,
  meta: {
    name: 'Starfire Matrix', shortName: 'Starfire', color, tint: '#f4e8ff', energy: 24, rarity: 'legendary',
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
        engine.spawnMany(['module:starfire-matrix:implant', 'module:starfire-matrix:starfall'], { position, color });
        return;
      }
      if (!enemy) return;
      const entered = combat.applyStatus(enemy, {
        id: 'starfire-matrix', duration: stats.duration, interval: stats.interval, damage: stats.damage, color,
        particle: { effectId: burningEffectId, interval: 0.28 },
      });
      if (entered && projectile?.behavior === 'static') {
        engine.spawnMany(['module:starfire-matrix:implant', 'module:starfire-matrix:starfall'], { position, color });
      }
    },
  },
  renderProjectile: ({ ctx, projectile }) => {
    const phase = projectile.life * 4.2 + projectile.id * 0.45;
    const radius = projectile.radius + 5;
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 22, color, 0.86);
    drawGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius + 10, accent, 0.55);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(phase * 0.35);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    for (let index = 0; index < 10; index += 1) {
      const angle = index * Math.PI * 2 / 10;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = accent;
    for (let index = 0; index < 3; index += 1) {
      const angle = phase + index * Math.PI * 2 / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.moveTo(0, -3);
    ctx.lineTo(0, 3);
    ctx.stroke();
    ctx.restore();
  },
  onHit: ({ effects: engine, position }) => {
    engine.spawnMany(['module:starfire-matrix:implant', 'module:starfire-matrix:starfall'], { position, color });
  },
};
