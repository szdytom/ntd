import type { EffectDefinition } from '../effects/types';
import type { ModuleDefinition } from './types';

const color = '#f72585';
const stats = { maxRicochets: 2, radius: 140 } as const;
const RICOCHET_DASH: number[] = [3, 3];

const effects: readonly EffectDefinition[] = [
  {
    id: 'module:ricochet:turn',
    lifetime: 0.3,
    layer: 'air',
    render: (frame, painter) => {
      const target = frame.data as { x: number; y: number };
      const angle = Math.atan2(target.y - frame.y, target.x - frame.x);
      const length = Math.hypot(target.x - frame.x, target.y - frame.y);
      painter.lineAngle(frame.x, frame.y, angle, length * frame.easeOut(3), 2.5 * frame.fout, frame.color, frame.fout * 0.7);
      painter.triangle(
        frame.x + Math.cos(angle) * length * frame.easeOut(3),
        frame.y + Math.sin(angle) * length * frame.easeOut(3),
        7 * frame.fout,
        14 * frame.fout,
        angle,
        '#ffffff',
        frame.fout,
      );
      painter.ring(frame.x, frame.y, 5 + frame.easeOut(2) * 22, 2 * frame.fout, frame.color, frame.fout);
    },
  },
];

export const ricochetModule: ModuleDefinition = {
  id: 'ricochet',
  kind: 'modifier',
  meta: {
    name: 'Ricochet Mirror', shortName: 'Ricochet', symbol: '↗', color, tint: '#ffe7f2', energy: 19, rarity: 'rare',
    text: { detail: { ricochets: stats.maxRicochets, radius: stats.radius } },
  },
  effects,
  compile: (context) => context.modifyNext({}),
  renderProjectile: ({ ctx, projectile }) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.65;
    ctx.setLineDash(RICOCHET_DASH);
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  onHit: ({ effects: engine, position, projectile, enemy, combat }) => {
    if (!projectile || !enemy) return;
    const used = (projectile.moduleState['ricochet:used'] as number | undefined) ?? 0;
    const visited = (projectile.moduleState['ricochet:visited'] as number[] | undefined) ?? [enemy.id];
    if (used >= stats.maxRicochets) return;
    const target = combat.nearestEnemy(position, stats.radius, [...visited, enemy.id]);
    if (!target) return;
    projectile.moduleState['ricochet:used'] = used + 1;
    projectile.moduleState['ricochet:visited'] = [...visited, enemy.id, target.id];
    projectile.pierce += 1;
    combat.retarget(projectile, target);
    engine.spawn('module:ricochet:turn', { position, color, data: { ...target.position } });
  },
};
