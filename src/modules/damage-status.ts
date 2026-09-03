import type { EffectDefinition } from '../effects/types';
import type { StatusParticleSpec } from '../game/types';
import type { ModuleDefinition, ModuleIconComponent, ModuleRarity } from './types';

interface DamageStatusStats {
  readonly damageMultiplier: number;
  readonly damage: number;
  readonly duration: number;
  readonly interval: number;
}

interface DamageStatusModifierOptions {
  readonly id: string;
  readonly icon: ModuleIconComponent;
  readonly color: string;
  readonly tint: string;
  readonly energy: number;
  readonly rarity: ModuleRarity;
  readonly stats: DamageStatusStats;
  readonly effects: readonly EffectDefinition[];
  readonly hitEffectIds: readonly string[];
  readonly statusParticle?: StatusParticleSpec;
  readonly renderProjectile: NonNullable<ModuleDefinition['renderProjectile']>;
  readonly onTrail?: NonNullable<ModuleDefinition['onTrail']>;
}

/** Builds the shared compile, status application, and impact lifecycle for damage-over-time modifiers. */
export const createDamageStatusModifier = (options: DamageStatusModifierOptions): ModuleDefinition => ({
  id: options.id,
  kind: 'modifier',
  tags: ['status'],
  icon: options.icon,
  meta: {
    color: options.color,
    tint: options.tint,
    energy: options.energy,
    rarity: options.rarity,
    text: { detail: {
      direct: Math.round((1 - options.stats.damageMultiplier) * 100),
      damage: options.stats.damage,
      ticks: options.stats.duration / options.stats.interval,
      duration: options.stats.duration,
    } },
  },
  effects: options.effects,
  compile: (context) => context.modifyNext({ damageMultiplier: options.stats.damageMultiplier }),
  targetEffect: {
    channels: ['damage', 'static', 'secondary-hit'],
    apply: ({ effects, position, signal, projectile, targetEffectChannel, combat }) => {
      if (targetEffectChannel === 'secondary-hit') {
        effects.spawnMany(options.hitEffectIds, { position, color: options.color });
        return;
      }
      if (!signal) return;
      const entered = combat.applyStatus(signal, {
        id: options.id,
        duration: options.stats.duration,
        interval: options.stats.interval,
        damage: options.stats.damage,
        color: options.color,
        ...(options.statusParticle ? { particle: options.statusParticle } : {}),
      });
      if (entered && projectile?.behavior === 'static') {
        effects.spawnMany(options.hitEffectIds, { position, color: options.color });
      }
    },
  },
  renderProjectile: options.renderProjectile,
  onHit: ({ effects, position }) => {
    effects.spawnMany(options.hitEffectIds, { position, color: options.color });
  },
  ...(options.onTrail ? { onTrail: options.onTrail } : {}),
});
