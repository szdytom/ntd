import { coneSparks } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawProjectileGlow } from './render-utils';
import type { ModuleDefinition } from './types';

const color = '#4361ee';
const stats = {
  damage: 22,
  speed: 500,
  size: 5,
  maxChains: 4,
  chainDamageMultiplier: 0.78,
  chainRadius: 118,
} as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:arcbolt:muzzle',
    lifetime: 0.24,
    layer: 'air',
    bloom: 0.95,
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 4 + frame.easeOut(3) * 30, 2.8 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 5; index += 1) {
        const angle = frame.rotation + frame.random(index, -0.45, 0.45);
        painter.lineAngle(frame.x, frame.y, angle, frame.random(index + 20, 17, 38) * frame.fout, 2 * frame.fout, index % 2 ? '#fff' : frame.color, frame.fout);
      }
    },
  },
  {
    id: 'module:arcbolt:chain',
    lifetime: 0.22,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      const target = (frame.data as { x: number; y: number }).x === undefined
        ? { x: frame.x, y: frame.y }
        : frame.data as { x: number; y: number };
      const dx = target.x - frame.x;
      const dy = target.y - frame.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const segments = Math.max(3, Math.ceil(length / 18));
      let lastX = frame.x;
      let lastY = frame.y;
      for (let index = 1; index <= segments; index += 1) {
        const progress = index / segments;
        const normal = index === segments ? 0 : frame.random(index, -7, 7) * frame.fout;
        const x = frame.x + dx * progress + Math.cos(angle + Math.PI / 2) * normal;
        const y = frame.y + dy * progress + Math.sin(angle + Math.PI / 2) * normal;
        painter.line(lastX, lastY, x, y, 3.2 * frame.fout + 0.4, index % 2 ? '#ffffff' : frame.color, frame.fout);
        lastX = x;
        lastY = y;
      }
      painter.light(target.x, target.y, 25 * frame.fout, frame.color, 0.28 * frame.fout);
    },
  },
  coneSparks({ id: 'module:arcbolt:hit', lifetime: 0.3, count: 8, distance: 38, length: 10, stroke: 1.8, bloom: 0.9 }),
];

export const arcboltModule: ModuleDefinition = {
  id: 'arcbolt',
  kind: 'projectile',
  meta: {
    name: 'Arcbolt Core', shortName: 'Arcbolt', symbol: 'ϟ', color, tint: '#e9edff', energy: 25, rarity: 'legendary',
    text: { detail: { damage: stats.damage, chains: stats.maxChains } },
  },
  effects,
  compile: (context) => context.emitProjectile({ damage: stats.damage, speed: stats.speed, size: stats.size }),
  renderProjectile: ({ ctx, projectile }) => {
    drawProjectileGlow(ctx, projectile.position.x, projectile.position.y, projectile.radius, color);
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(projectile.position.x - 2, projectile.position.y - 5);
    ctx.lineTo(projectile.position.x + 2, projectile.position.y - 1);
    ctx.lineTo(projectile.position.x - 1, projectile.position.y + 5);
    ctx.stroke();
    ctx.restore();
  },
  onCast: ({ effects: engine, position, rotation }) => engine.spawn('module:arcbolt:muzzle', { position, rotation, color }),
  onHit: ({ effects: engine, position, rotation, projectile, enemy, combat }) => {
    engine.spawn('module:arcbolt:hit', { position, rotation, color });
    if (!projectile || !enemy) return;
    const visited = [enemy.id];
    let origin = { ...enemy.position };
    let damage = projectile.damage * stats.chainDamageMultiplier;
    for (let index = 0; index < stats.maxChains; index += 1) {
      const target = combat.nearestEnemy(origin, stats.chainRadius, visited);
      if (!target) break;
      engine.spawn('module:arcbolt:chain', { position: origin, color, data: { ...target.position } });
      combat.dealDamage(target, damage, color, projectile);
      visited.push(target.id);
      origin = { ...target.position };
      damage *= stats.chainDamageMultiplier;
    }
  },
};
