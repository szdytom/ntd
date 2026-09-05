import type { ModuleDefinition } from './types';
const color = '#b34ac5';
const stats = { damage: 38, speed: 310, size: 10, splash: 88 } as const;
export const geodeBloomModule: ModuleDefinition = {
    id: 'geode-bloom',
    kind: 'projectile',
    tags: ['projectile', 'area'],
    meta: {
        color, energy: 40, rarity: 'epic',
        text: { detail: { damage: stats.damage, radius: stats.splash } }
    },
    compile: (context) => context.emitProjectile(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:geode-bloom:muzzle', { position, rotation, color }),
    onHit: ({ visuals: engine, position, rotation, projectile }) => {
        if (projectile?.splash === 0)
            return;
        engine.spawnMany(['module:geode-bloom:blast-outer', 'module:geode-bloom:blast-inner', 'module:geode-bloom:shards', 'module:geode-bloom:debris'], { position, rotation, color });
    }
};
