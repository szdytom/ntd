import { STARFIRE_COLOR as color, STARFIRE_PLASMA_COLOR as plasmaColor } from './starfire';
import { extendStatusTrail } from './status-trail';
import type { ModuleDefinition } from './types';
const burningEffectId = 'module:starfire-trail:burning';
const stats = {
    damageMultiplierPerSecond: 0.45,
    width: 44,
    duration: 2,
    settlementInterval: 0.25,
    burnDamage: 5,
    burnDuration: 2,
    burnInterval: 0.4
} as const;
export const starfireTrailModule: ModuleDefinition = {
    id: 'starfire-trail',
    kind: 'trail',
    tags: ['trail', 'area', 'status'],
    meta: {
        color, energy: 48, rarity: 'epic',
        text: { detail: {
                damage: Math.round(stats.damageMultiplierPerSecond * 100),
                width: stats.width,
                duration: stats.duration,
                burnDamage: stats.burnDamage,
                burnTicks: stats.burnDuration / stats.burnInterval
            } }
    },
    compile: (context) => context.modifyNext({}),
    onTrail: ({ visuals: engine, position, rotation, projectile, combat }) => {
        if (!projectile)
            return;
        const extended = extendStatusTrail(combat, projectile, position, {
            moduleId: 'starfire-trail',
            duration: stats.duration,
            width: stats.width,
            damageMultiplierPerSecond: stats.damageMultiplierPerSecond,
            settlementInterval: stats.settlementInterval,
            color,
            statusDuration: stats.burnDuration,
            statusInterval: stats.burnInterval,
            statusDamage: stats.burnDamage,
            statusColor: plasmaColor,
            statusEffectId: burningEffectId,
            statusParticleInterval: 0.32,
            hitEffectId: 'module:starfire-trail:contact'
        });
        if (!extended)
            return;
        const visualKey = 'starfire-trail:visual-ticks';
        const visualTicks = ((projectile.moduleState[visualKey] as number | undefined) ?? 0) + 1;
        projectile.moduleState[visualKey] = visualTicks;
        if ((visualTicks - 1) % 2 === 0) {
            engine.spawn('module:starfire-trail:plasma', { position, rotation, color });
        }
        if ((visualTicks - 1) % 4 === 0) {
            engine.spawn('module:starfire-trail:starfall', { position, rotation, color });
        }
    }
};
