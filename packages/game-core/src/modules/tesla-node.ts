import type { ModuleDefinition } from './types';
const color = '#00bbf9';
const stats = {
    damage: 20,
    size: 7,
    duration: 5.5,
    armTime: 0.24,
    triggerRadius: 120,
    cooldown: 0.7,
    maxTriggers: 6,
    chainRadius: 72,
    chainDamageMultiplier: 0.58
} as const;
export const teslaNodeModule: ModuleDefinition = {
    id: 'tesla-node',
    kind: 'static',
    tags: ['static', 'area'],
    meta: {
        color, energy: 22, rarity: 'legendary',
        text: { detail: {
                damage: stats.damage,
                chainDamage: Math.round(stats.damage * stats.chainDamageMultiplier),
                interval: stats.cooldown,
                attacks: stats.maxTriggers
            } }
    },
    compile: (context) => context.emitProjectile({
        damage: stats.damage,
        speed: 0,
        size: stats.size,
        lifetime: stats.duration,
        static: {
            duration: stats.duration,
            armTime: stats.armTime,
            triggerRadius: stats.triggerRadius,
            cooldown: stats.cooldown,
            maxTriggers: stats.maxTriggers
        }
    }),
    onDeploy: ({ visuals: engine, position }) => engine.spawn('module:tesla:deploy', { position, color }),
    onTrigger: ({ visuals: engine, position, projectile, triggerTarget, combat }) => {
        if (!projectile || !triggerTarget)
            return;
        engine.spawn('module:tesla:zap', { position, color, data: { ...triggerTarget.position } });
        combat.dealDamage(triggerTarget, projectile.damage, color, projectile);
        const secondary = combat.nearestSignal(triggerTarget.position, stats.chainRadius, [triggerTarget.id]);
        if (secondary) {
            engine.spawn('module:tesla:zap', { position: triggerTarget.position, color, data: { ...secondary.position } });
            combat.dealDamage(secondary, projectile.damage * stats.chainDamageMultiplier, color, projectile);
        }
    }
};
