import { createDamageStatusModifier } from './damage-status';
const color = '#70e000';
const stats = { damageMultiplier: 0.9, damage: 3, duration: 3, interval: 0.5 } as const;
export const toxinModule = createDamageStatusModifier({
    id: 'toxin',
    color,
            energy: 10,
    rarity: 'uncommon',
    stats,
    hitEffectIds: ['module:toxin:infect', 'module:toxin:drops'],
    onTrail: ({ visuals, position, projectile }) => {
        if (!projectile)
            return;
        const count = ((projectile.moduleState['toxin:trail'] as number | undefined) ?? 0) + 1;
        projectile.moduleState['toxin:trail'] = count;
        if (count % 3 === 0)
            visuals.spawn('module:toxin:trail', { position, color });
    }
});
