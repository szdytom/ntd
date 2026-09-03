import type { EffectDefinition } from '../effects/types';
import { fireParticles, statusOrbs } from '../effects/factories';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const EmberFieldIcon = createModuleIcon(<>
  <circle className="module-icon__line" cx="16" cy="16" r="10" />
  <path className="module-icon__line" d="M16 9l6 11H10z" />
  <circle className="module-icon__fill" cx="16" cy="5" r="2" />
  <circle className="module-icon__fill" cx="6" cy="22" r="2" />
  <circle className="module-icon__fill" cx="26" cy="22" r="2" />
</>);

const color = '#ff7a1a';
const statusColor = '#c2410c';
const brightColor = '#ffd166';
const smokeColor = '#514046';
const burningEffectId = 'module:ember-field:burning';
const EMBER_FIELD_DASH: number[] = [2, 6];
const stats = {
  damage: 2,
  size: 9,
  duration: 4,
  radius: 68,
  pulseInterval: 0.75,
  maxTriggers: 6,
  statusDuration: 1,
  damageInterval: 0.5,
} as const;

const effects: readonly EffectDefinition[] = [
  statusOrbs({ id: burningEffectId, size: 3.5, hotColor: brightColor, bloom: 0.76 }),
  {
    id: 'module:ember-field:deploy',
    lifetime: 0.48,
    layer: 'ground',
    bloom: 0.65,
    render: (frame, painter) => {
      const flash = Math.max(0, 1 - frame.fin / 0.38);
      const radius = 8 + frame.easeOut(3) * 65;
      painter.ring(frame.x, frame.y, radius, 4.2 * flash + 0.25, brightColor, flash);
      painter.polygon(frame.x, frame.y, radius * 0.82, 6, frame.rotation + frame.fin * 0.5, frame.color, frame.fout * 0.72, 2.3 * frame.fout + 0.25);
      painter.light(frame.x, frame.y, 86 * frame.fout, frame.color, frame.slope * 0.5);
      for (let index = 0; index < 12; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        const travel = 5 + frame.easeOut(3) * frame.random(index + 20, 27, 67);
        const x = frame.x + Math.cos(angle) * travel;
        const y = frame.y + Math.sin(angle) * travel;
        const particleColor = frame.fin < 0.26 ? '#ffffff' : frame.fin < 0.68 ? brightColor : statusColor;
        painter.lineAngle(x, y, angle, 4 + 14 * frame.fout, 2.2 * frame.fout + 0.25, particleColor, frame.fout);
      }
      painter.circle(frame.x, frame.y, 8 * flash, '#ffffff', flash);
    },
  },
  fireParticles({
    id: 'module:ember-field:embers',
    count: 14,
    distanceMin: 18,
    distanceMax: 67,
    liftMin: 3,
    liftMax: 15,
    sizeMin: 3,
    sizeMax: 7,
    hotColor: brightColor,
    emberColor: statusColor,
    smokeColor,
  }),
  {
    id: 'module:ember-field:pulse',
    lifetime: 0.3,
    layer: 'ground',
    bloom: 0.4,
    render: (frame, painter) => {
      const flash = Math.max(0, 1 - frame.fin / 0.45);
      const radius = 16 + frame.easeOut(3) * 52;
      painter.ring(frame.x, frame.y, radius, 3.4 * flash + 0.25, brightColor, flash);
      painter.light(frame.x, frame.y, 70 * frame.fout, frame.color, frame.slope * 0.26);
      for (let index = 0; index < 10; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        const travel = 8 + frame.easeOut(3) * frame.random(index + 20, 31, 61);
        const x = frame.x + Math.cos(angle) * travel;
        const y = frame.y + Math.sin(angle) * travel - frame.fin * frame.random(index + 40, 0, 8);
        painter.circle(
          x,
          y,
          0.8 + frame.slope * frame.random(index + 60, 2.5, 5),
          frame.fin < 0.5 ? index % 3 === 0 ? '#ffffff' : brightColor : statusColor,
          frame.fout * 0.75,
        );
      }
    },
  },
];

export const emberFieldModule: ModuleDefinition = {
  id: 'ember-field',
  kind: 'static',
  tags: ['static', 'area', 'status'],
  icon: EmberFieldIcon,
  meta: {
    color, displayColor: '#ed7118', tint: '#fff1e8', energy: 18, rarity: 'common',
    text: { detail: {
      radius: stats.radius,
      pulseInterval: stats.pulseInterval,
      damage: stats.damage,
      damageInterval: stats.damageInterval,
      duration: stats.duration,
    } },
  },
  effects,
  compile: (context) => context.emitProjectile({
    damage: stats.damage,
    speed: 0,
    size: stats.size,
    lifetime: stats.duration,
    static: {
      duration: stats.duration,
      armTime: 0,
      triggerRadius: stats.radius,
      cooldown: stats.pulseInterval,
      maxTriggers: stats.maxTriggers,
    },
  }),
  renderProjectile: ({ ctx, projectile }) => {
    const { x, y } = projectile.position;
    drawGlow(ctx, x, y, 40, color, 0.42);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(projectile.age * 0.45);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(7, 5);
    ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    for (let index = 0; index < 9; index += 1) {
      const seed = projectile.id * 0.37 + index * 1.91;
      const angle = seed + projectile.age * (index % 2 === 0 ? 0.22 : -0.17);
      const orbit = 13 + index % 4 * 13;
      const pulse = 0.72 + Math.sin(projectile.age * (4.2 + index * 0.13) + seed) * 0.28;
      const cellX = x + Math.cos(angle) * orbit;
      const cellY = y + Math.sin(angle) * orbit - pulse * 4;
      const outerRadius = (4.5 + index % 3 * 1.5) * (0.8 + pulse * 0.35);
      ctx.globalAlpha = 0.16 + pulse * 0.14;
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(cellX, cellY, outerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.36 + pulse * 0.28;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cellX, cellY - outerRadius * 0.18, outerRadius * 0.58, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 + pulse * 0.32;
      ctx.fillStyle = index % 3 === 0 ? '#ffffff' : brightColor;
      ctx.beginPath();
      ctx.arc(cellX, cellY - outerRadius * 0.38, Math.max(1.2, outerRadius * 0.25), 0, Math.PI * 2);
      ctx.fill();
    }
    for (let index = 0; index < 4; index += 1) {
      const seed = projectile.id * 0.53 + index * 2.17;
      const smokePhase = (projectile.age * 0.32 + index * 0.23) % 1;
      const angle = seed + index * Math.PI / 2;
      const orbit = 18 + index * 9;
      ctx.globalAlpha = (1 - smokePhase) * 0.13;
      ctx.fillStyle = smokeColor;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * orbit,
        y + Math.sin(angle) * orbit - smokePhase * 22,
        3 + smokePhase * 7,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 0.28 + Math.sin(projectile.age * 3.2) * 0.06;
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.2;
    ctx.setLineDash(EMBER_FIELD_DASH);
    ctx.beginPath();
    ctx.arc(x, y, projectile.shot.static?.triggerRadius ?? stats.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onDeploy: ({ effects: engine, position }) => {
    engine.spawnMany(['module:ember-field:deploy', 'module:ember-field:embers'], { position, color });
  },
  onTrigger: ({ effects: engine, position, projectile, combat }) => {
    engine.spawn('module:ember-field:pulse', { position, rotation: projectile?.age ?? 0, color });
    for (const signal of combat.nearbyEnemies(position, stats.radius)) {
      if (projectile) combat.affectTarget(signal, projectile, 'static');
      combat.applyStatus(signal, {
        id: 'ember-field',
        duration: stats.statusDuration,
        interval: stats.damageInterval,
        damage: stats.damage,
        color: statusColor,
        particle: { effectId: burningEffectId, interval: 0.44 },
      });
    }
  },
};
