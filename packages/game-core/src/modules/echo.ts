import type { ModuleDefinition } from './types';
const color = '#8e44ad';
const stats = { repeats: 2, repeatDelay: 0.16 } as const;
export const echoModule: ModuleDefinition = {
    id: 'echo',
    kind: 'logic',
    tags: ['repeat'],
    meta: {
        color, energy: 24, rarity: 'rare',
        text: { detail: { casts: stats.repeats, interval: stats.repeatDelay } }
    },
    compile: (context) => context.modifyNext(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:echo:ripple', { position, rotation, color })
};
