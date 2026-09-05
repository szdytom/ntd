import type { ModuleDefinition } from './types';
const color = '#3a86ff';
const stats = { crossingTicks: 1, payloadCount: 1 } as const;
export const terrainTriggerModule: ModuleDefinition = {
    id: 'terrain-trigger',
    kind: 'logic',
    tags: ['trigger'],
    meta: {
        color, energy: 9, rarity: 'uncommon',
        text: { detail: { ticks: stats.crossingTicks, payloads: stats.payloadCount } }
    },
    compile: (context) => context.wrapNext({
        type: 'terrain',
        payloadCount: stats.payloadCount,
        crossingTicks: stats.crossingTicks
    }),
    onTrigger: ({ visuals: engine, position, rotation }) => engine.spawn('module:terrain-trigger:release', { position, rotation, color })
};
