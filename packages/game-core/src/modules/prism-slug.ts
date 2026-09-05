import type { ModuleDefinition } from './types';
const color = '#2864c7';
const stats = { damage: 42, speed: 500, size: 6 } as const;
export const prismSlugModule: ModuleDefinition = {
    id: 'prism-slug',
    kind: 'projectile',
    tags: ['projectile'],
    meta: {
        color, energy: 27, rarity: 'rare',
        text: { detail: { damage: stats.damage } }
    },
    compile: (context) => context.emitProjectile(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:prism-slug:muzzle', { position, rotation, color }),
    onHit: ({ visuals: engine, position, rotation }) => engine.spawn('module:prism-slug:impact-clamp', { position, rotation, color }),
    onTrail: ({ visuals: engine, position, rotation }) => engine.spawn('module:prism-slug:trail', { position, rotation, color })
};
