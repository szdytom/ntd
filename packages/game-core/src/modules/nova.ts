import type { ModuleDefinition } from './types';
const color = '#ff9f43';
const stats = { damage: 24, speed: 350, size: 8, splash: 64 } as const;
export const novaModule: ModuleDefinition = {
    id: 'nova',
    kind: 'projectile',
    tags: ['projectile', 'area'],
    meta: {
        color, energy: 30, rarity: 'uncommon',
        text: { detail: { damage: stats.damage, radius: stats.splash } }
    },
    compile: (context) => context.emitProjectile(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:nova:muzzle', { position, rotation, color }),
    onHit: ({ visuals: engine, position, projectile }) => {
        if (projectile?.splash === 0)
            return;
        engine.spawnMany(['module:nova:blast-a', 'module:nova:blast-b', 'module:nova:debris'], { position, color });
    }
};
