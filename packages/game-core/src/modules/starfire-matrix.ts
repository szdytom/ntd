import { createDamageStatusModifier } from './damage-status';
import { STARFIRE_COLOR as color } from './starfire';
const burningEffectId = 'module:starfire-matrix:burning';
const stats = { damageMultiplier: 0.78, damage: 7, duration: 3.2, interval: 0.4 } as const;
export const starfireMatrixModule = createDamageStatusModifier({
    id: 'starfire-matrix',
    color,
            energy: 24,
    rarity: 'legendary',
    stats,
    hitEffectIds: ['module:starfire-matrix:implant', 'module:starfire-matrix:starfall'],
    statusParticle: { effectId: burningEffectId, interval: 0.28 }
});
