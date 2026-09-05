import type { ModuleDefinition } from './types';
const color = '#d1495b';
const stats = { damagePerRadius: 0.025, splash: 0 } as const;
export const condenseCoreModule: ModuleDefinition = {
    id: 'condense-core',
    kind: 'modifier',
    tags: ['area'],
    meta: {
        color, energy: 25, rarity: 'uncommon',
        text: { detail: { damage: stats.damagePerRadius * 100 } }
    },
    compile: (context) => context.modifyNext({
        splashSet: stats.splash,
        condenseSplash: { damagePerRadius: stats.damagePerRadius }
    }),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:condense-core:collapse', { position, rotation, color }),
    onHit: ({ visuals: engine, position, rotation }) => engine.spawn('module:condense-core:collapse', { position, rotation, color })
};
