import type { ModuleDefinition } from './types';
const color = '#ff8c42';
const stats = { payloadCount: 1 } as const;
export const expirationTriggerModule: ModuleDefinition = {
    id: 'expiration-trigger',
    kind: 'logic',
    tags: ['trigger', 'reliable-trigger'],
    meta: {
        color, energy: 12, rarity: 'rare',
        text: { detail: { payloads: stats.payloadCount } }
    },
    compile: (context) => context.wrapNext({ type: 'expiration', payloadCount: stats.payloadCount }),
    onTrigger: ({ visuals: engine, position, rotation }) => engine.spawn('module:expiration-trigger:release', { position, rotation, color })
};
