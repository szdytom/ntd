import type { ModuleDefinition } from './types';
const color = '#ff4d8d';
const stats = { damage: 14, speed: 620, size: 4, maxTargets: 3 } as const;
export const needleModule: ModuleDefinition = {
    id: 'needle',
    kind: 'projectile',
    tags: ['projectile'],
    meta: {
        color, energy: 22, rarity: 'uncommon',
        text: { detail: { damage: stats.damage, targets: stats.maxTargets } }
    },
    compile: (context) => context.emitProjectile({
        damage: stats.damage,
        speed: stats.speed,
        size: stats.size,
        pierce: stats.maxTargets - 1
    }),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:needle:muzzle', { position, rotation, color }),
    onHit: ({ visuals: engine, position, rotation }) => {
        engine.spawn('module:needle:hit-ring', { position, color });
        engine.spawn('module:needle:hit-sparks', { position, rotation, color });
    }
};
