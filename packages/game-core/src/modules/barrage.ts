import type { ModuleDefinition } from './types';
const color = '#ef476f';
const stats = { repeats: 4, repeatDelay: 0.09 } as const;
export const barrageModule: ModuleDefinition = {
    id: 'barrage',
    kind: 'logic',
    tags: ['repeat'],
    meta: {
        color, energy: 46, rarity: 'legendary',
        text: {
            description: { casts: stats.repeats },
            detail: { casts: stats.repeats, interval: stats.repeatDelay }
        }
    },
    compile: (context) => context.modifyNext(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:barrage:tick', { position, rotation, color })
};
