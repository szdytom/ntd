import type { ModuleDefinition } from './types';
import { extendStatusTrail } from './status-trail';
const color = '#ff6b1a';
const darkColor = '#9f2d0f';
const burningEffectId = 'module:cinder-trail:burning';
const stats = {
    damageMultiplierPerSecond: 0.25,
    width: 32,
    duration: 1.5,
    settlementInterval: 0.25,
    burnDamage: 3,
    burnDuration: 1.5,
    burnInterval: 0.5
} as const;
export const cinderTrailModule: ModuleDefinition = {
    id: 'cinder-trail',
    kind: 'trail',
    tags: ['trail', 'area', 'status'],
    meta: {
        color, energy: 28, rarity: 'uncommon',
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
            moduleId: 'cinder-trail',
            duration: stats.duration,
            width: stats.width,
            damageMultiplierPerSecond: stats.damageMultiplierPerSecond,
            settlementInterval: stats.settlementInterval,
            color,
            statusDuration: stats.burnDuration,
            statusInterval: stats.burnInterval,
            statusDamage: stats.burnDamage,
            statusColor: darkColor,
            statusEffectId: burningEffectId,
            statusParticleInterval: 0.4,
            hitEffectId: 'module:cinder-trail:contact'
        });
        if (!extended)
            return;
        engine.spawn('module:cinder-trail:embers', { position, rotation, color });
    }
};
