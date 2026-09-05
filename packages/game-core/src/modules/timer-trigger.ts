import type { ModuleDefinition } from './types';
const color = '#fee440';
const stats = { delay: 0.55, payloadCount: 1 } as const;
export const timerTriggerModule: ModuleDefinition = {
    id: 'timer-trigger',
    kind: 'logic',
    tags: ['trigger', 'reliable-trigger'],
    meta: {
        color, energy: 7, rarity: 'common',
        text: { detail: { delay: stats.delay, payloads: stats.payloadCount } }
    },
    compile: (context) => context.wrapNext({ type: 'timer', payloadCount: stats.payloadCount, delay: stats.delay }),
    onTrigger: ({ visuals: engine, position }) => engine.spawn('module:timer-trigger:release', { position, color })
};
