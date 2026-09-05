import type { ModuleDefinition } from './types';
const color = '#00b894';
const stats = { count: 3, spreadDegrees: 12 } as const;
export const forkModule: ModuleDefinition = {
    id: 'fork',
    kind: 'modifier',
    tags: [],
    meta: {
        color, energy: 34, rarity: 'epic',
        text: {
            description: { count: stats.count },
            detail: { count: stats.count, spread: stats.spreadDegrees }
        }
    },
    compile: (context) => context.modifyNext({ count: stats.count, spread: stats.spreadDegrees * Math.PI / 180 }),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:fork:split', { position, rotation, color })
};
