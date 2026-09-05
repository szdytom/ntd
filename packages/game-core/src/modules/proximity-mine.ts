import type { ModuleDefinition } from './types';
const color = '#ff3d6e';
const stats = {
    damage: 52,
    size: 8,
    duration: 7,
    armTime: 0.38,
    triggerRadius: 72,
    blastRadius: 88,
    maxTriggers: 1
} as const;
export const proximityMineModule: ModuleDefinition = {
    id: 'proximity-mine',
    kind: 'static',
    tags: ['static', 'area'],
    meta: {
        color, energy: 28, rarity: 'rare',
        text: { detail: { damage: stats.damage } }
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
            cooldown: 0,
            maxTriggers: stats.maxTriggers
        }
    }),
    onDeploy: ({ visuals: engine, position }) => engine.spawn('module:mine:deploy', { position, color }),
    onTrigger: ({ visuals: engine, position, projectile, combat }) => {
        engine.spawnMany(['module:mine:blast-a', 'module:mine:blast-b', 'module:mine:debris'], { position, color });
        if (!projectile)
            return;
        for (const signal of combat.nearbyEnemies(position, stats.blastRadius)) {
            combat.dealDamage(signal, projectile.damage, color, projectile);
        }
    }
};
