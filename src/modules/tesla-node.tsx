import { shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const TeslaNodeIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M16 16V6M16 16l-9 5M16 16l9 5" />
  <circle className="module-icon__fill" cx="16" cy="5" r="3" />
  <circle className="module-icon__fill" cx="6" cy="22" r="3" />
  <circle className="module-icon__fill" cx="26" cy="22" r="3" />
  <circle className="module-icon__fill" cx="16" cy="16" r="4" />
</>);

const color = '#00bbf9';
const stats = {
  damage: 20,
  size: 7,
  duration: 5.5,
  armTime: 0.24,
  triggerRadius: 120,
  cooldown: 0.7,
  maxTriggers: 6,
  chainRadius: 72,
  chainDamageMultiplier: 0.58,
} as const;

const effects: readonly EffectDefinition[] = [
  shockwave({ id: 'module:tesla:deploy', lifetime: 0.48, radius: 52, stroke: 2.5, sides: 8, layer: 'ground' }),
  {
    id: 'module:tesla:zap',
    lifetime: 0.2,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      const target = frame.data as { x: number; y: number };
      const dx = target.x - frame.x;
      const dy = target.y - frame.y;
      const angle = Math.atan2(dy, dx);
      const segments = 7;
      let lastX = frame.x;
      let lastY = frame.y;
      for (let index = 1; index <= segments; index += 1) {
        const progress = index / segments;
        const normal = index === segments ? 0 : frame.random(index, -8, 8) * frame.fout;
        const x = frame.x + dx * progress + Math.cos(angle + Math.PI / 2) * normal;
        const y = frame.y + dy * progress + Math.sin(angle + Math.PI / 2) * normal;
        painter.line(lastX, lastY, x, y, 3 * frame.fout + 0.5, index % 2 ? '#fff' : frame.color, frame.fout);
        lastX = x;
        lastY = y;
      }
      painter.ring(target.x, target.y, 4 + frame.easeOut(3) * 22, 2 * frame.fout, frame.color, frame.fout);
    },
  },
];

export const teslaNodeModule: ModuleDefinition = {
  id: 'tesla-node',
  kind: 'static',
  tags: ['static', 'area'],
  icon: TeslaNodeIcon,
  meta: {
    name: 'Tesla Sentry', shortName: 'Sentry', color, tint: '#e2f8ff', energy: 22, rarity: 'legendary',
    text: { detail: {
      damage: stats.damage,
      chainDamage: Math.round(stats.damage * stats.chainDamageMultiplier),
      interval: stats.cooldown,
      attacks: stats.maxTriggers,
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
      armTime: stats.armTime,
      triggerRadius: stats.triggerRadius,
      cooldown: stats.cooldown,
      maxTriggers: stats.maxTriggers,
    },
  }),
  renderProjectile: ({ ctx, projectile }) => {
    drawGlow(ctx, projectile.position.x, projectile.position.y, 16 + 13, color, 0.9);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(projectile.age * 1.4);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let index = 0; index < 3; index += 1) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();
      ctx.fillStyle = index === projectile.triggerCount % 3 ? '#fff' : color;
      ctx.beginPath();
      ctx.arc(16, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(projectile.age * 5) * 0.05;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.shot.static?.triggerRadius ?? stats.triggerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onDeploy: ({ effects: engine, position }) => engine.spawn('module:tesla:deploy', { position, color }),
  onTrigger: ({ effects: engine, position, projectile, triggerTarget, combat }) => {
    if (!projectile || !triggerTarget) return;
    engine.spawn('module:tesla:zap', { position, color, data: { ...triggerTarget.position } });
    combat.dealDamage(triggerTarget, projectile.damage, color, projectile);
    const secondary = combat.nearestSignal(triggerTarget.position, stats.chainRadius, [triggerTarget.id]);
    if (secondary) {
      engine.spawn('module:tesla:zap', { position: triggerTarget.position, color, data: { ...secondary.position } });
      combat.dealDamage(secondary, projectile.damage * stats.chainDamageMultiplier, color, projectile);
    }
  },
};
