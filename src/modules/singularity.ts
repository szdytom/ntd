import { shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';

const color = '#4c2a85';
const SINGULARITY_DASH: number[] = [5, 7];
const stats = {
  damage: 1,
  size: 10,
  duration: 3,
  armTime: 0.2,
  radius: 150,
  cooldown: 1.2,
  maxTriggers: 5,
  pull: 48,
} as const;

const effects: readonly EffectDefinition[] = [
  shockwave({ id: 'module:singularity:deploy', lifetime: 0.5, radius: 68, stroke: 3.2, sides: 10, layer: 'ground', bloom: 0.9 }),
  {
    id: 'module:singularity:pull',
    lifetime: 0.46,
    layer: 'ground',
    bloom: 0.75,
    render: (frame, painter) => {
      for (let index = 0; index < 4; index += 1) {
        const angle = frame.rotation + index * Math.PI / 2 + frame.fin * 2.2;
        const radius = 58 * (1 - frame.fin * frame.fin * frame.fin) + 12;
        painter.lineAngle(
          frame.x + Math.cos(angle) * radius,
          frame.y + Math.sin(angle) * radius,
          angle + Math.PI,
          22 * frame.fout,
          2.4 * frame.fout,
          index % 2 ? '#ffffff' : frame.color,
          frame.fout,
        );
      }
      painter.ring(frame.x, frame.y, 10 + frame.slope * 14, 2.5 * frame.fout, frame.color, frame.fout);
    },
  },
];

export const singularityModule: ModuleDefinition = {
  id: 'singularity',
  kind: 'static',
  meta: {
    name: 'Collapse Singularity', shortName: 'Singularity', symbol: '●', color, tint: '#eee8ff', energy: 82, rarity: 'legendary',
    text: { detail: { duration: stats.duration, radius: stats.radius } },
  },
  effects,
  compile: (context) => context.emitProjectile({
    damage: stats.damage,
    speed: 0,
    size: stats.size,
    lifetime: stats.duration,
    static: {
      duration: stats.duration,
      armTime: stats.armTime,
      triggerRadius: stats.radius,
      cooldown: stats.cooldown,
      maxTriggers: stats.maxTriggers,
      gravity: { pull: stats.pull, radius: stats.radius },
    },
  }),
  renderProjectile: ({ ctx, projectile }) => {
    const armed = projectile.age >= (projectile.shot.static?.armTime ?? 0);
    drawGlow(ctx, projectile.position.x, projectile.position.y, 13 + (armed ? 22 : 9), color, armed ? 1 : 0.85);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(projectile.age * 0.75);
    ctx.fillStyle = '#160d2b';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armed ? '#cbb8ff' : color;
    ctx.lineWidth = 2.3;
    for (let radius = 18; radius <= 25; radius += 7) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0.18, Math.PI * 1.55);
      ctx.stroke();
      ctx.rotate(Math.PI);
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = armed ? 0.2 + Math.sin(projectile.age * 4) * 0.05 : 0.1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.setLineDash(SINGULARITY_DASH);
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.shot.static?.gravity?.radius ?? stats.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onDeploy: ({ effects: engine, position }) => engine.spawn('module:singularity:deploy', { position, color }),
  onTrigger: ({ effects: engine, position, projectile, combat }) => {
    engine.spawn('module:singularity:pull', {
      position,
      rotation: projectile?.age ?? 0,
      color,
    });
    if (!projectile) return;
    for (const enemy of combat.nearbyEnemies(position, projectile.shot.static?.gravity?.radius ?? stats.radius)) {
      combat.affectTarget(enemy, projectile, 'static');
    }
  },
};
