import type { ModuleDefinition } from './types';
// Mindustry Pal.heal, used by Navanax's suppression orb.
const color = '#98ffa9';
const stats = {
    damage: 28,
    speed: 170,
    size: 8,
    lifetime: 10
} as const;
export const voidBeamModule: ModuleDefinition = {
    id: 'void-beam',
    kind: 'projectile',
    tags: ['projectile', 'fixed-route', 'trail-carrier'],
    meta: {
        color, energy: 21, rarity: 'uncommon',
        text: { detail: { power: stats.damage, speed: stats.speed } }
    },
    compile: (context) => context.emitProjectile({
        ...stats,
        collision: 'none',
        trajectory: 'fixed',
        aim: 'direct',
        boundary: 'world'
    }),
    onCast: ({ visuals: engine, position, rotation }) => {
        engine.spawn('module:void-beam:cast', { position, rotation, color });
    },
    onTrail: ({ visuals: engine, position, rotation }) => {
        engine.spawn('module:void-beam:wisp', { position, rotation, color });
    }
};
