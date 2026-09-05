import { COMBAT_BALANCE } from '../game/balance';
import type { ModuleDefinition } from './types';
const color = '#15b86a';
const stats = { damageMultiplier: 0.88, energyRefundMultiplier: 0.18 } as const;
export const reclaimCircuitModule: ModuleDefinition = {
    id: 'reclaim-circuit',
    kind: 'logic',
    tags: [],
    meta: {
        color, energy: 10, rarity: 'epic',
        text: { detail: {
                damage: Math.round((1 - stats.damageMultiplier) * 100),
                refund: Math.round(stats.energyRefundMultiplier * 100),
                cap: Math.round(COMBAT_BALANCE.maxEnergyRefundPerCycle * 100)
            } }
    },
    compile: (context) => context.modifyNext(stats),
    onHit: ({ visuals: engine, position, rotation, damageDealt }) => {
        if (!damageDealt || damageDealt <= 0)
            return;
        engine.spawn('module:reclaim-circuit:return', { position, rotation, color });
    }
};
