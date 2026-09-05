import type { ModuleDefinition } from './types';
const color = '#51cf66';
const darkColor = '#2f9e44';
const stats = {
    damage: 3,
    size: 10,
    duration: 5,
    radius: 86,
    pulseInterval: 0.5,
    maxTriggers: 10,
    statusDuration: 1.25,
    damageInterval: 0.4
} as const;
export const toxicCloudModule: ModuleDefinition = {
    id: 'toxic-cloud',
    kind: 'static',
    tags: ['static', 'area', 'status'],
    meta: {
        color, energy: 30, rarity: 'uncommon',
        text: { detail: {
                pulseInterval: stats.pulseInterval,
                damage: stats.damage,
                damageInterval: stats.damageInterval,
                duration: stats.duration
            } }
    },
    compile: (context) => context.emitProjectile({
        damage: stats.damage,
        speed: 0,
        size: stats.size,
        lifetime: stats.duration,
        static: {
            duration: stats.duration,
            armTime: 0,
            triggerRadius: stats.radius,
            cooldown: stats.pulseInterval,
            maxTriggers: stats.maxTriggers
        }
    }),
    onDeploy: ({ visuals: engine, position }) => {
        engine.spawnMany(['module:toxic-cloud:spawn', 'module:toxic-cloud:bloom'], { position, color });
    },
    onTrigger: ({ visuals: engine, position, projectile, combat }) => {
        engine.spawn('module:toxic-cloud:pulse', { position, color });
        for (const signal of combat.nearbyEnemies(position, stats.radius)) {
            if (projectile)
                combat.affectTarget(signal, projectile, 'static');
            combat.applyStatus(signal, {
                id: 'toxic-cloud',
                duration: stats.statusDuration,
                interval: stats.damageInterval,
                damage: stats.damage,
                color: darkColor
            });
        }
    }
};
