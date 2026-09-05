import type { ModuleDefinition } from './types';
const color = '#06d6a0';
const stats = { damageMultiplier: 0.78, energyMultiplier: 0.62 } as const;
export const economizerModule: ModuleDefinition = {
    id: 'economizer',
    kind: 'logic',
    tags: [],
    meta: {
        color, energy: 3, rarity: 'uncommon',
        text: { detail: {
                energy: Math.round((1 - stats.energyMultiplier) * 100),
                damage: Math.round((1 - stats.damageMultiplier) * 100)
            } }
    },
    compile: (context) => context.modifyNext(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:economizer:recycle', { position, rotation, color })
};
