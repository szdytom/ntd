import type { ModuleDefinition } from './types';
const color = '#f72585';
const stats = { maxRicochets: 2, radius: 140 } as const;
export const ricochetModule: ModuleDefinition = {
    id: 'ricochet',
    kind: 'modifier',
    tags: ['route'],
    meta: {
        color, energy: 19, rarity: 'rare',
        text: { detail: { ricochets: stats.maxRicochets, radius: stats.radius } }
    },
    compile: (context) => context.modifyNext({}),
    onHit: ({ visuals: engine, position, projectile, signal, combat }) => {
        if (!projectile || !signal)
            return;
        const used = (projectile.moduleState['ricochet:used'] as number | undefined) ?? 0;
        const visited = (projectile.moduleState['ricochet:visited'] as number[] | undefined) ?? [signal.id];
        if (used >= stats.maxRicochets)
            return;
        const target = combat.nearestSignal(position, stats.radius, [...visited, signal.id]);
        if (!target)
            return;
        projectile.moduleState['ricochet:used'] = used + 1;
        projectile.moduleState['ricochet:visited'] = [...visited, signal.id, target.id];
        projectile.pierce += 1;
        combat.retarget(projectile, target);
        engine.spawn('module:ricochet:turn', { position, color, data: { ...target.position } });
    }
};
