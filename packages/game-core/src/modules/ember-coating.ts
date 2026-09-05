import { createDamageStatusModifier } from './damage-status';
const color = '#ff8a3d';
const burningEffectId = 'module:ember-coating:burning';
const stats = { damageMultiplier: 0.96, damage: 2, duration: 2.5, interval: 0.5 } as const;
export const emberCoatingModule = createDamageStatusModifier({
    id: 'ember-coating',
    color,
            energy: 6,
    rarity: 'common',
    stats,
    hitEffectIds: ['module:ember-coating:ignite', 'module:ember-coating:cinders'],
    statusParticle: { effectId: burningEffectId, interval: 0.4 }
});
