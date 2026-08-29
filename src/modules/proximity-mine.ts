import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import { drawGlow } from '../game/glow';
import type { ModuleDefinition } from './types';

const color = '#ff3d6e';
const MINE_DASH: number[] = [4, 5];
const stats = {
  damage: 52,
  size: 8,
  duration: 7,
  armTime: 0.38,
  triggerRadius: 72,
  blastRadius: 88,
  maxTriggers: 1,
} as const;

const effects: readonly EffectDefinition[] = [
  shockwave({ id: 'module:mine:deploy', lifetime: 0.42, radius: 45, stroke: 2.5, sides: 6, layer: 'ground' }),
  shockwave({ id: 'module:mine:blast-a', lifetime: 0.48, radius: 90, stroke: 5 }),
  shockwave({ id: 'module:mine:blast-b', lifetime: 0.34, radius: 62, stroke: 3, sides: 6 }),
  coneSparks({ id: 'module:mine:debris', lifetime: 0.58, count: 22, distance: 105, length: 17, stroke: 2.5 }),
];

export const proximityMineModule: ModuleDefinition = {
  id: 'proximity-mine',
  kind: 'static',
  meta: {
    name: 'Hex Proximity Mine', shortName: 'Mine', symbol: '⬢', color, tint: '#ffe7ed', energy: 28, rarity: 'rare',
    text: { detail: { damage: stats.damage } },
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
      cooldown: 0,
      maxTriggers: stats.maxTriggers,
    },
  }),
  renderProjectile: ({ ctx, projectile }) => {
    const armed = projectile.age >= (projectile.shot.static?.armTime ?? 0);
    const rotation = projectile.age * 0.8;
    drawGlow(ctx, projectile.position.x, projectile.position.y, 11 + (armed ? 14 : 7), color, armed ? 1 : 0.8);
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(rotation);
    ctx.fillStyle = armed ? color : '#ff9ab5';
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3;
      const radius = 11;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, armed ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = armed ? 0.36 + Math.sin(projectile.age * 7) * 0.12 : 0.16;
    ctx.strokeStyle = color;
    ctx.lineWidth = armed ? 1.7 : 1;
    ctx.setLineDash(MINE_DASH);
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.shot.static?.triggerRadius ?? stats.triggerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onDeploy: ({ effects: engine, position }) => engine.spawn('module:mine:deploy', { position, color }),
  onTrigger: ({ effects: engine, position, projectile, combat }) => {
    engine.spawnMany(['module:mine:blast-a', 'module:mine:blast-b', 'module:mine:debris'], { position, color });
    if (!projectile) return;
    for (const enemy of combat.nearbyEnemies(position, stats.blastRadius)) {
      combat.dealDamage(enemy, projectile.damage, color, projectile);
    }
  },
};
