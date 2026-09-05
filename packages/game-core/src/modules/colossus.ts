import type { ModuleDefinition } from './types';
const color = '#ff7b00';
const stats = {
    damageMultiplier: 1.55,
    speedMultiplier: 0.8,
    sizeMultiplier: 1.75,
    splashBonus: 32
} as const;
export const colossusModule: ModuleDefinition = {
    id: 'colossus',
    kind: 'modifier',
    tags: [],
    meta: {
        color, energy: 9, rarity: 'rare',
        text: { detail: {
                damage: Math.round((stats.damageMultiplier - 1) * 100),
                size: Math.round((stats.sizeMultiplier - 1) * 100),
                radius: stats.splashBonus
            } }
    },
    compile: (context) => context.modifyNext(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:colossus:charge', { position, rotation, color })
};
