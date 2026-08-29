import { shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#4c2a85';

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
    description: 'Deploys a gravity well that drags nearby enemies backward', detail: 'Trigger payload only · 3 seconds · 150 radius',
  },
  effects,
  compile: (context) => context.emitProjectile({
    damage: 1,
    speed: 0,
    size: 10,
    lifetime: 3,
    static: {
      duration: 3,
      armTime: 0.2,
      triggerRadius: 150,
      cooldown: 1.2,
      maxTriggers: 5,
      gravity: { pull: 48, radius: 150 },
    },
  }),
  renderProjectile: ({ ctx, projectile }) => {
    const armed = projectile.age >= (projectile.shot.static?.armTime ?? 0);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(projectile.age * 0.75);
    ctx.shadowColor = color;
    ctx.shadowBlur = armed ? 22 : 9;
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
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.shot.static?.gravity?.radius ?? 150, 0, Math.PI * 2);
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
    for (const enemy of combat.nearbyEnemies(position, projectile.shot.static?.gravity?.radius ?? 150)) {
      combat.affectTarget(enemy, projectile, 'static');
    }
  },
};
