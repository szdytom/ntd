import type { ModuleDefinition } from './types';
import { extendSpatialRift, RIFT_SPACE_COLOR, RIFT_SPACE_CONTACT, RIFT_SPACE_RETENTION } from './rift-space';
const hitEffectId = 'module:rift-trail:cross';
const stats = {
    jitter: 0.75,
    damageMultiplierPerSecond: 2.5
} as const;
export const riftTrailModule: ModuleDefinition = {
    id: 'rift-trail',
    kind: 'trail',
    tags: ['trail', 'rift-space'],
    meta: {
        color: RIFT_SPACE_COLOR, energy: 82, rarity: 'legendary',
        text: { detail: {
                damage: stats.damageMultiplierPerSecond,
                width: RIFT_SPACE_CONTACT.width,
                duration: RIFT_SPACE_RETENTION
            } }
    },
    compile: (context) => context.modifyNext({}),
    onTrail: ({ position, projectile, combat }) => {
        if (!projectile)
            return;
        const updateKey = 'rift-trail:last-age';
        if (projectile.moduleState[updateKey] === projectile.age)
            return;
        projectile.moduleState[updateKey] = projectile.age;
        const stacks = projectile.modules.filter((id) => id === 'rift-trail').length;
        const damagePerSecond = projectile.damage * stats.damageMultiplierPerSecond * stacks;
        extendSpatialRift(combat, projectile, 'rift-trail', position, {
            duration: RIFT_SPACE_RETENTION,
            damagePerSecond,
            jitter: stats.jitter,
            hitEffectId
        });
    }
};
