import type { ModuleDefinition } from './types';
const color = '#ff7a1a';
const statusColor = '#c2410c';
const burningEffectId = 'module:ember-field:burning';
const stats = {
    damage: 2,
    size: 9,
    duration: 4,
    radius: 68,
    pulseInterval: 0.75,
    maxTriggers: 6,
    statusDuration: 1,
    damageInterval: 0.5
} as const;
export const emberFieldModule: ModuleDefinition = {
    id: 'ember-field',
    kind: 'static',
    tags: ['static', 'area', 'status'],
    meta: {
        color, energy: 18, rarity: 'common',
        text: { detail: {
                radius: stats.radius,
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
        engine.spawnMany(['module:ember-field:deploy', 'module:ember-field:embers'], { position, color });
    },
    onTrigger: ({ visuals: engine, position, projectile, combat }) => {
        engine.spawn('module:ember-field:pulse', { position, rotation: projectile?.age ?? 0, color });
        for (const signal of combat.nearbyEnemies(position, stats.radius)) {
            if (projectile)
                combat.affectTarget(signal, projectile, 'static');
            combat.applyStatus(signal, {
                id: 'ember-field',
                duration: stats.statusDuration,
                interval: stats.damageInterval,
                damage: stats.damage,
                color: statusColor,
                particle: { effectId: burningEffectId, interval: 0.44 }
            });
        }
    }
};
