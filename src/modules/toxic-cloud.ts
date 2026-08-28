import { shockwave } from '../effects/factories';
import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#51cf66';
const darkColor = '#2f9e44';

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
  meta: {
    name: '翡翠毒雾', shortName: '毒雾', symbol: '☁', color, tint: '#ebfbee', energy: 30, rarity: 'uncommon',
    description: '在触发位置生成持续腐蚀区域', detail: '仅能作为触发载荷 · 存在 5 秒',
  },
  effects,
  compile: (context) => context.emitProjectile({
    damage: 3,
    speed: 0,
    size: 10,
    lifetime: 5,
    static: { duration: 5, armTime: 0, triggerRadius: 86, cooldown: 0.5, maxTriggers: 10 },
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
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(x, y, projectile.shot.static?.triggerRadius ?? 86, 0, Math.PI * 2);
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
  onTrigger: ({ effects: engine, position, combat }) => {
    engine.spawn('module:toxic-cloud:pulse', { position, color });
    for (const enemy of combat.nearbyEnemies(position, 86)) {
      combat.applyStatus(enemy, {
        id: 'toxic-cloud',
        duration: 1.25,
        interval: 0.4,
        damage: 3,
        color: darkColor,
      });
    }
  },
};
