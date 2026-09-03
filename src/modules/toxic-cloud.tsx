import { shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const ToxicCloudIcon = createModuleIcon(<>
  <path className="module-icon__line" d="M7 22h17a5 5 0 0 0 0-10 8 8 0 0 0-15-2 6 6 0 0 0-2 12z" />
  <circle className="module-icon__fill" cx="12" cy="17" r="2" />
  <circle className="module-icon__fill" cx="20" cy="16" r="2" />
  <path className="module-icon__thin" d="M10 26l-2 3M17 26v4M24 26l2 3" />
</>);

const color = '#51cf66';
const darkColor = '#2f9e44';
const TOXIC_DASH: number[] = [3, 7];
const stats = {
  damage: 3,
  size: 10,
  duration: 5,
  radius: 86,
  pulseInterval: 0.5,
  maxTriggers: 10,
  statusDuration: 1.25,
  damageInterval: 0.4,
} as const;

const effects: readonly EffectDefinition[] = [
  shockwave({ id: 'module:toxic-cloud:spawn', lifetime: 0.52, radius: 82, stroke: 3, sides: 8, layer: 'ground' }),
  {
    id: 'module:toxic-cloud:bloom',
    lifetime: 0.72,
    layer: 'under-projectile',
    render: (frame, painter) => {
      for (let index = 0; index < 13; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        const travel = frame.easeOut(3) * frame.random(index + 20, 20, 74);
        const radius = frame.random(index + 40, 6, 15) * frame.slope;
        painter.circle(
          frame.x + Math.cos(angle) * travel,
          frame.y + Math.sin(angle) * travel,
          radius,
          index % 3 === 0 ? '#d8f5a2' : frame.color,
          frame.fout * 0.34,
        );
      }
    },
  },
  {
    id: 'module:toxic-cloud:pulse',
    lifetime: 0.38,
    layer: 'ground',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 18 + frame.easeOut(3) * 64, 2.2 * frame.fout, frame.color, frame.fout * 0.55);
      painter.light(frame.x, frame.y, 58, frame.color, frame.slope * 0.14);
    },
  },
];

export const toxicCloudModule: ModuleDefinition = {
  id: 'toxic-cloud',
  kind: 'static',
  tags: ['static', 'area', 'status'],
  icon: ToxicCloudIcon,
  meta: {
    color, displayColor: '#42a853', tint: '#ebfbee', energy: 30, rarity: 'uncommon',
    text: { detail: {
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
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let index = 0; index < 9; index += 1) {
      const seed = projectile.id * 0.73 + index * 2.31;
      const angle = seed + projectile.age * (index % 2 === 0 ? 0.24 : -0.18);
      const orbit = 18 + (index % 4) * 12 + Math.sin(seed * 1.7) * 4;
      const pulse = 1 + Math.sin(projectile.age * 2.8 + seed) * 0.12;
      ctx.globalAlpha = 0.08 + (index % 3) * 0.025;
      ctx.fillStyle = index % 3 === 0 ? '#94d82d' : color;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * orbit, y + Math.sin(angle) * orbit, (18 + index % 4 * 3) * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.42 + Math.sin(projectile.age * 3.4) * 0.08;
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1.4;
    ctx.setLineDash(TOXIC_DASH);
    ctx.beginPath();
    ctx.arc(x, y, projectile.shot.static?.triggerRadius ?? stats.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  onDeploy: ({ effects: engine, position }) => {
    engine.spawnMany(['module:toxic-cloud:spawn', 'module:toxic-cloud:bloom'], { position, color });
  },
  onTrigger: ({ effects: engine, position, projectile, combat }) => {
    engine.spawn('module:toxic-cloud:pulse', { position, color });
    for (const signal of combat.nearbyEnemies(position, stats.radius)) {
      if (projectile) combat.affectTarget(signal, projectile, 'static');
      combat.applyStatus(signal, {
        id: 'toxic-cloud',
        duration: stats.statusDuration,
        interval: stats.damageInterval,
        damage: stats.damage,
        color: darkColor,
      });
    }
  },
};
