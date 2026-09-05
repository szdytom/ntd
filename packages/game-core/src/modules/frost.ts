import type { ModuleDefinition } from './types';
const color = '#00a8e8';
const stats = { slow: 0.3, duration: 1.6 } as const;
export const frostModule: ModuleDefinition = {
    id: 'frost',
    kind: 'modifier',
    tags: ['status'],
    meta: {
        color, energy: 5, rarity: 'common',
        text: { detail: { slow: Math.round(stats.slow * 100), duration: stats.duration } }
    },
    compile: (context) => context.modifyNext({ slow: stats.slow, slowDuration: stats.duration }),
    targetEffect: {
        channels: ['damage', 'static', 'secondary-hit'],
        apply: ({ visuals: engine, position, signal, projectile, shot, targetEffectChannel, combat }) => {
            if (targetEffectChannel === 'secondary-hit') {
                engine.spawnMany(['module:frost:hit-ring', 'module:frost:shards'], { position, color });
                return;
            }
            if (signal && combat.applySlow(signal, shot.slow, shot.slowDuration) && projectile?.behavior === 'static') {
                engine.spawnMany(['module:frost:hit-ring', 'module:frost:shards'], { position, color });
            }
        }
    },
    onHit: ({ visuals: engine, position }) => {
        engine.spawnMany(['module:frost:hit-ring', 'module:frost:shards'], { position, color });
    },
    onTrail: ({ visuals: engine, position }) => engine.spawn('module:frost:trail', { position, color })
};
