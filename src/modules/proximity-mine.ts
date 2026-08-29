import { coneSparks, shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#ff3d6e';

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
    description: 'Deploys at the trigger point and waits for enemies', detail: 'Trigger payload only · 52 area damage',
  },
  effects,
  compile: (context) => context.emitProjectile({
    damage: 52,
    speed: 0,
    size: 8,
    lifetime: 7,
    static: { duration: 7, armTime: 0.38, triggerRadius: 72, cooldown: 0, maxTriggers: 1 },
  }),
  renderProjectile: ({ ctx, projectile }) => {
    const armed = projectile.age >= (projectile.shot.static?.armTime ?? 0);
    const rotation = projectile.age * 0.8;
    ctx.save();
    ctx.translate(projectile.position.x, projectile.position.y);
    ctx.rotate(rotation);
    ctx.shadowColor = color;
    ctx.shadowBlur = armed ? 14 : 7;
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
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.shot.static?.triggerRadius ?? 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onDeploy: ({ effects: engine, position }) => engine.spawn('module:mine:deploy', { position, color }),
  onTrigger: ({ effects: engine, position, projectile, combat }) => {
    engine.spawnMany(['module:mine:blast-a', 'module:mine:blast-b', 'module:mine:debris'], { position, color });
    if (!projectile) return;
    for (const enemy of combat.nearbyEnemies(position, 88)) combat.dealDamage(enemy, projectile.damage, color, projectile);
  },
};
