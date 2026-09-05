import type { ModuleDefinition } from './types';
const color = '#f15bb5';
const stats = { carrierCount: 1, payloadCount: 1 } as const;
export const impactTriggerModule: ModuleDefinition = {
    id: 'impact-trigger',
    kind: 'logic',
    tags: ['trigger', 'reliable-trigger'],
    meta: {
        color, energy: 6, rarity: 'common',
        text: { detail: { carriers: stats.carrierCount, payloads: stats.payloadCount } }
    },
    compile: (context) => context.wrapNext({ type: 'impact', payloadCount: stats.payloadCount }),
    onTrigger: ({ visuals: engine, position, rotation }) => engine.spawn('module:impact-trigger:release', { position, rotation, color })
};
