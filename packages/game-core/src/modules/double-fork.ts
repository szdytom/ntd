import type { ModuleDefinition } from './types';
const color = '#20a486';
const stats = { count: 2, spreadDegrees: 15 } as const;
export const doubleForkModule: ModuleDefinition = {
    id: 'double-fork',
    kind: 'modifier',
    tags: [],
    meta: {
        color, energy: 18, rarity: 'rare',
        text: {
            description: { count: stats.count },
            detail: { count: stats.count, spread: stats.spreadDegrees }
        }
    },
    compile: (context) => context.modifyNext({
        count: stats.count,
        spread: stats.spreadDegrees * Math.PI / 180
    }),
    onCast: ({ visuals: engine, position, rotation }) => {
        engine.spawn('module:double-fork:split', { position, rotation, color });
    }
};
