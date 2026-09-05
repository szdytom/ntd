import type { ModuleDefinition } from './types';
const color = '#4c2a85';
const stats = {
    damage: 1,
    size: 10,
    duration: 3,
    armTime: 0.2,
    radius: 150,
    cooldown: 1.2,
    maxTriggers: 5,
    pull: 48
} as const;
export const singularityModule: ModuleDefinition = {
    id: 'singularity',
    kind: 'static',
    tags: ['static', 'area'],
    meta: {
        color, energy: 82, rarity: 'legendary',
        text: { detail: { duration: stats.duration, radius: stats.radius } }
    },
    compile: (context) => context.emitProjectile({
        damage: stats.damage,
        speed: 0,
        size: stats.size,
        lifetime: stats.duration,
        static: {
            duration: stats.duration,
            armTime: stats.armTime,
            triggerRadius: stats.radius,
            cooldown: stats.cooldown,
            maxTriggers: stats.maxTriggers,
            gravity: { pull: stats.pull, radius: stats.radius }
        }
    }),
    onDeploy: ({ visuals: engine, position }) => engine.spawn('module:singularity:deploy', { position, color }),
    onTrigger: ({ visuals: engine, position, projectile, combat }) => {
        engine.spawn('module:singularity:pull', {
            position,
            rotation: projectile?.age ?? 0,
            color
        });
        if (!projectile)
            return;
        for (const signal of combat.nearbyEnemies(position, projectile.shot.static?.gravity?.radius ?? stats.radius)) {
            combat.affectTarget(signal, projectile, 'static');
        }
    }
};
