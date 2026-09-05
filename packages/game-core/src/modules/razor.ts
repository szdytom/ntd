import type { ModuleDefinition } from './types';
const color = '#00b4d8';
const stats = { damage: 14, speed: 400, size: 8, maxTargets: 5, lifetime: 2 } as const;
export const razorModule: ModuleDefinition = {
    id: 'razor',
    kind: 'projectile',
    tags: ['projectile'],
    meta: {
        color, energy: 24, rarity: 'rare',
        text: { detail: { damage: stats.damage, targets: stats.maxTargets } }
    },
    compile: (context) => context.emitProjectile({
        damage: stats.damage,
        speed: stats.speed,
        size: stats.size,
        pierce: stats.maxTargets - 1,
        lifetime: stats.lifetime
    }),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:razor:muzzle', { position, rotation, color }),
    onHit: ({ visuals: engine, position, rotation }) => engine.spawn('module:razor:hit', { position, rotation, color })
};
