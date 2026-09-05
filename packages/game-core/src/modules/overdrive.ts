import type { ModuleDefinition } from './types';
const color = '#ff5c5c';
const stats = { damageMultiplier: 1.5, speedMultiplier: 1.2 } as const;
export const overdriveModule: ModuleDefinition = {
    id: 'overdrive',
    kind: 'modifier',
    tags: [],
    meta: {
        color, energy: 8, rarity: 'uncommon',
        text: { detail: {
                damage: Math.round((stats.damageMultiplier - 1) * 100),
                speed: Math.round((stats.speedMultiplier - 1) * 100)
            } }
    },
    compile: (context) => context.modifyNext(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:overdrive:corona', { position, rotation, color }),
    onHit: ({ visuals: engine, position, rotation }) => engine.spawn('module:overdrive:impact', { position, rotation, color })
};
