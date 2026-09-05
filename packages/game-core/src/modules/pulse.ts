import type { ModuleDefinition } from './types';
const color = '#6c5ce7';
const stats = { damage: 18, speed: 440, size: 5 } as const;
export const pulseModule: ModuleDefinition = {
    id: 'pulse',
    kind: 'projectile',
    tags: ['projectile'],
    meta: {
        color, energy: 15, rarity: 'common',
        text: { detail: { damage: stats.damage } }
    },
    compile: (context) => context.emitProjectile(stats),
    onCast: ({ visuals: engine, position, rotation }) => {
        engine.spawn('module:pulse:muzzle', { position, rotation, color });
    },
    onHit: ({ visuals: engine, position }) => {
        engine.spawnMany(['module:pulse:hit-ring', 'module:pulse:hit-sparks'], { position, color });
    },
    onTrail: ({ visuals: engine, position }) => {
        engine.spawn('module:pulse:trail', { position, color });
    }
};
