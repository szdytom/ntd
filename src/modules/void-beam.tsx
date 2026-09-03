import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const VoidBeamIcon = createModuleIcon(<>
  <circle className="module-icon__thick" cx="16" cy="16" r="10" />
  <circle className="module-icon__thin" cx="16" cy="16" r="6" />
  <circle className="module-icon__fill" cx="19" cy="13" r="2" />
  <path className="module-icon__thin" d="M4 9l-2-2M28 23l2 2" />
</>);

// Mindustry Pal.heal, used by Navanax's suppression orb.
const color = '#98ffa9';
const ORB_PARTICLE_COUNT = 10;
const ORB_PARTICLE_LIFE = 1.85;
const stats = {
  damage: 28,
  speed: 170,
  size: 8,
  lifetime: 10,
} as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:void-beam:cast',
    lifetime: 0.42,
    layer: 'air',
    bloom: 0.8,
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 7 + frame.easeOut(3) * 31, 2.2 * frame.fout, frame.color, frame.fout);
      painter.circle(frame.x, frame.y, 3.2 * frame.fout, frame.color, frame.fout);
    },
  },
  {
    id: 'module:void-beam:wisp',
    lifetime: 0.44,
    layer: 'under-projectile',
    bloom: 0.55,
    render: (frame, painter) => {
      for (let index = 0; index < 3; index += 1) {
        const angle = frame.rotation + Math.PI + frame.random(index, -0.75, 0.75);
        const distance = frame.random(index + 5, 4, 20) * frame.easeOut(2);
        const x = frame.x + Math.cos(angle) * distance;
        const y = frame.y + Math.sin(angle) * distance;
        painter.circle(x, y, frame.random(index + 9, 1.2, 3.4) * frame.fout, frame.color, frame.fout * 0.55);
      }
    },
  },
];

const wanderingLightOffset = (id: number, time: number, radius: number): { x: number; y: number } => {
  const phase = id * 0.61803398875;
  return {
    x: (
      Math.sin(time * 0.83 + phase) +
      Math.sin(time * 0.37 + phase * 2.1) * 0.45
    ) * radius * 0.31,
    y: (
      Math.cos(time * 0.69 + phase * 1.7) +
      Math.sin(time * 0.29 - phase * 0.8) * 0.4
    ) * radius * 0.31,
  };
};

const orbSeed = (id: number, index: number, salt: number): number => {
  const value = Math.sin(id * 12.9898 + index * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
};

/** Mirrors Navanax's suppression orb: seeded particles swell, orbit, and collapse around a pulsing ring. */
const drawOrbParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ringRadius: number,
  time: number,
  id: number,
  emissive: boolean,
): void => {
  ctx.save();
  if (emissive) ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < ORB_PARTICLE_COUNT; index += 1) {
    const fin = (orbSeed(id, index, 1) + time / ORB_PARTICLE_LIFE) % 1;
    const slope = 1 - Math.abs(fin * 2 - 1);
    if (slope <= 0.02) continue;
    const circleOut = Math.sqrt(1 - (1 - slope) * (1 - slope));
    const angle = orbSeed(id, index, 2) * Math.PI * 2 + time * 0.36 + id * 0.07;
    // Navanax uses particleLen/orbRadius = 7/5 and particleSize/orbRadius = 3/5,
    // keeping the orbiting circles intersected with the ring as attached lobes.
    const distance = ringRadius * 1.4 * circleOut;
    const particleRadius = ringRadius * 0.6 * slope;
    const particleX = x + Math.cos(angle) * distance;
    const particleY = y + Math.sin(angle) * distance;

    ctx.globalAlpha = emissive ? 0.62 : 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawVoidRing = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  id: number,
): void => {
  // Navanax: orbRadius + absin(orbSinScl = 8 ticks, orbSinMag = 1).
  const ringRadius = radius + Math.abs(Math.sin(time * 7.5 + id * 0.13)) * radius * 0.2;
  const lightOffset = wanderingLightOffset(id, time, ringRadius);
  const lightX = x + lightOffset.x;
  const lightY = y + lightOffset.y;
  ctx.save();
  drawOrbParticles(ctx, x, y, ringRadius, time, id, false);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = ringRadius * 0.4;
  ctx.beginPath();
  ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(lightX, lightY, ringRadius * 0.33, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const voidBeamModule: ModuleDefinition = {
  id: 'void-beam',
  kind: 'projectile',
  tags: ['projectile', 'fixed-route', 'trail-carrier'],
  icon: VoidBeamIcon,
  meta: {
    color, displayColor: '#61a36c', tint: '#e9ffed', energy: 21, rarity: 'uncommon',
    text: { detail: { power: stats.damage, speed: stats.speed } },
  },
  effects,
  compile: (context) => context.emitProjectile({
    ...stats,
    collision: 'none',
    trajectory: 'fixed',
    aim: 'direct',
    boundary: 'world',
  }),
  renderProjectile: ({ ctx, projectile }) => {
    drawVoidRing(
      ctx,
      projectile.position.x,
      projectile.position.y,
      projectile.radius,
      projectile.age,
      projectile.id,
    );
  },
  renderProjectileBloom: ({ ctx, projectile }) => {
    const ringRadius = projectile.radius
      + Math.abs(Math.sin(projectile.age * 7.5 + projectile.id * 0.13)) * projectile.radius * 0.2;
    const lightOffset = wanderingLightOffset(projectile.id, projectile.age, ringRadius);
    const lightX = projectile.position.x + lightOffset.x;
    const lightY = projectile.position.y + lightOffset.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawOrbParticles(
      ctx,
      projectile.position.x,
      projectile.position.y,
      ringRadius,
      projectile.age,
      projectile.id,
      true,
    );
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = color;
    ctx.lineWidth = ringRadius * 0.4;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lightX, lightY, ringRadius * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => {
    engine.spawn('module:void-beam:cast', { position, rotation, color });
  },
  onTrail: ({ effects: engine, position, rotation }) => {
    engine.spawn('module:void-beam:wisp', { position, rotation, color });
  },
};
