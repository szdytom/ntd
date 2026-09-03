import type { EffectDefinition } from '../effects/types';
import { COMBAT_BALANCE } from '../game/balance';
import type { ModuleDefinition } from './types';
import { createModuleIcon } from './icons';

const ReclaimCircuitIcon = createModuleIcon(<>
  <path className="module-icon__thick" d="M26 16A10 10 0 1 1 16 6" />
  <path className="module-icon__fill" d="M14 2l9 4-9 4z" />
  <path className="module-icon__line" d="M17 10l-5 7h5l-2 6 6-9h-5z" />
</>);

const color = '#15b86a';
const stats = { damageMultiplier: 0.88, energyRefundMultiplier: 0.18 } as const;

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:reclaim-circuit:return',
    lifetime: 0.38,
    layer: 'air',
    bloom: 0.75,
    render: (frame, painter) => {
      const radius = 8 + frame.easeOut(3) * 26;
      painter.ring(frame.x, frame.y, radius, 2.6 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 3; index += 1) {
        const angle = frame.rotation + index * Math.PI * 2 / 3 - frame.fin * 1.8;
        const x = frame.x + Math.cos(angle) * radius;
        const y = frame.y + Math.sin(angle) * radius;
        painter.triangle(x, y, 5 * frame.fout, 12 * frame.fout, angle - Math.PI / 2, '#ffffff', frame.fout);
      }
    },
  },
];

export const reclaimCircuitModule: ModuleDefinition = {
  id: 'reclaim-circuit',
  kind: 'logic',
  tags: [],
  icon: ReclaimCircuitIcon,
  meta: {
    color, displayColor: '#13aa62', tint: '#e4fff1', energy: 10, rarity: 'epic',
    text: { detail: {
      damage: Math.round((1 - stats.damageMultiplier) * 100),
      refund: Math.round(stats.energyRefundMultiplier * 100),
      cap: Math.round(COMBAT_BALANCE.maxEnergyRefundPerCycle * 100),
    } },
  },
  effects,
  compile: (context) => context.modifyNext(stats),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.68;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 4, -projectile.age * 4, Math.PI * 1.5 - projectile.age * 4);
    ctx.stroke();
    ctx.restore();
  },
  onHit: ({ effects: engine, position, rotation, damageDealt }) => {
    if (!damageDealt || damageDealt <= 0) return;
    engine.spawn('module:reclaim-circuit:return', { position, rotation, color });
  },
};
