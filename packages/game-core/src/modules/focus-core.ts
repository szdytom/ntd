import type { ModuleDefinition } from './types';
const color = '#e63973';
const stats = { damagePerCharge: 0.9, speedPerCharge: 0.12, projectileCount: 1 } as const;
export const focusCoreModule: ModuleDefinition = {
    id: 'focus-core',
    kind: 'modifier',
    tags: [],
    meta: {
        color, energy: 28, rarity: 'rare',
        text: {
            description: { count: stats.projectileCount },
            detail: {
                damage: Math.round(stats.damagePerCharge * 100),
                speed: Math.round(stats.speedPerCharge * 100)
            }
        }
    },
    compile: (context) => context.modifyNext({
        focusConversion: { damagePerCharge: stats.damagePerCharge, speedPerCharge: stats.speedPerCharge }
    }),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:focus-core:charge', { position, rotation, color })
};
