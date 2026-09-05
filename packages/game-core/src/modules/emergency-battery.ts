import type { ModuleDefinition } from './types';
const color = '#2fbf71';
const stats = { energyReduction: 15 } as const;
export const emergencyBatteryModule: ModuleDefinition = {
    id: 'emergency-battery',
    kind: 'logic',
    tags: [],
    meta: {
        color,         energy: -stats.energyReduction, rarity: 'uncommon',
        text: { detail: { energy: stats.energyReduction } }
    },
    compile: (context) => context.modifyNext({}),
    onCast: ({ visuals: engine, position, rotation }) => {
        engine.spawn('module:emergency-battery:discharge', { position, rotation, color });
    }
};
