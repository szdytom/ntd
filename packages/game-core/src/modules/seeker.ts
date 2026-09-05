import type { ModuleDefinition } from './types';
const color = '#168aad';
const stats = { seeking: 8 } as const;
export const seekerModule: ModuleDefinition = {
    id: 'seeker',
    kind: 'logic',
    tags: ['route'],
    meta: {
        color, energy: 10, rarity: 'uncommon'
    },
    compile: (context) => context.modifyNext(stats),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:seeker:lock', { position, rotation, color }),
    onHit: ({ visuals: engine, position, rotation }) => engine.spawn('module:seeker:hit', { position, rotation, color })
};
