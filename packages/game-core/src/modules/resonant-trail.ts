import { COMBAT_BALANCE } from '../game/balance';
import type { ModuleDefinition } from './types';
const color = '#9b5de5';
const stats = {
    speedMultiplier: 0.96,
    pulseEveryTicks: 4,
    damageMultiplier: 1.5,
    minimumDamage: 5,
    radius: 56
} as const;
/**
 * A trail modifier is attached to the next emitted projectile by the compiler.
 * Its behavior is therefore independent from the carrier projectile module.
 */
export const resonantTrailModule: ModuleDefinition = {
    id: 'resonant-trail',
    kind: 'trail',
    tags: ['trail'],
    meta: {
        color, energy: 44, rarity: 'epic',
        text: { detail: {
                interval: stats.pulseEveryTicks * COMBAT_BALANCE.projectileTrailInterval,
                damage: Math.round(stats.damageMultiplier * 100),
                radius: stats.radius,
                speed: Math.round((1 - stats.speedMultiplier) * 100)
            } }
    },
    compile: (context) => context.modifyNext({ speedMultiplier: stats.speedMultiplier }),
    onTrail: ({ visuals: engine, position, rotation, projectile, combat }) => {
        if (!projectile)
            return;
        engine.spawn('module:resonant-trail:wake', { position, rotation, color });
        const key = 'resonant-trail:ticks';
        const ticks = ((projectile.moduleState[key] as number | undefined) ?? 0) + 1;
        projectile.moduleState[key] = ticks;
        if (ticks % stats.pulseEveryTicks !== 0)
            return;
        engine.spawn('module:resonant-trail:pulse', { position, color });
        const pulseDamage = Math.max(stats.minimumDamage, Math.round(projectile.damage * stats.damageMultiplier));
        for (const target of combat.nearbyEnemies(position, stats.radius)) {
            combat.dealDamage(target, pulseDamage, color, projectile);
        }
    }
};
