import type { ModuleDefinition } from './types';
const color = '#4361ee';
const stats = {
    damage: 22,
    speed: 500,
    size: 5,
    maxChains: 5,
    chainDamageMultiplier: 0.78,
    chainRadius: 118
} as const;
export const arcboltModule: ModuleDefinition = {
    id: 'arcbolt',
    kind: 'projectile',
    tags: ['projectile'],
    meta: {
        color, energy: 31, rarity: 'legendary',
        text: { detail: { damage: stats.damage, chains: stats.maxChains } }
    },
    compile: (context) => context.emitProjectile({
        damage: stats.damage,
        speed: stats.speed,
        size: stats.size,
        chainTargets: stats.maxChains
    }),
    onCast: ({ visuals: engine, position, rotation }) => engine.spawn('module:arcbolt:muzzle', { position, rotation, color }),
    onHit: ({ visuals: engine, position, rotation, projectile, signal, combat }) => {
        engine.spawn('module:arcbolt:hit', { position, rotation, color });
        if (!projectile || !signal)
            return;
        const visited = [signal.id];
        let origin = { ...signal.position };
        let damage = projectile.damage * stats.chainDamageMultiplier;
        const maxChains = projectile.shot.chainTargets ?? stats.maxChains;
        for (let index = 0; index < maxChains; index += 1) {
            const target = combat.nearestSignal(origin, stats.chainRadius, visited);
            if (!target)
                break;
            engine.spawn('module:arcbolt:chain', { position: origin, color, data: { ...target.position } });
            const damageDealt = combat.dealDamage(target, damage, color, projectile);
            if (damageDealt > 0)
                combat.affectTarget(target, projectile, 'secondary-hit');
            visited.push(target.id);
            origin = { ...target.position };
            damage *= stats.chainDamageMultiplier;
        }
    }
};
