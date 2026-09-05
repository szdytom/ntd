import { createDamageStatusModifier } from './damage-status';
const color = '#ff3d00';
const burningEffectId = 'module:searing-sigil:burning';
const stats = { damageMultiplier: 0.82, damage: 5, duration: 3, interval: 0.5 } as const;
export const searingSigilModule = createDamageStatusModifier({
    id: 'searing-sigil',
    color,
            energy: 18,
    rarity: 'rare',
    stats,
    hitEffectIds: ['module:searing-sigil:brand', 'module:searing-sigil:flare'],
    statusParticle: { effectId: burningEffectId, interval: 0.34 }
});
