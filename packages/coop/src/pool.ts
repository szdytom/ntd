import type { ORCHESTRATION_MODULE_IDS } from '@prism-bastion/game-core/game/orchestration-codec';
import type { ModuleId } from '@prism-bastion/game-core/game/types';

export type CoopPoolCount = number | 'unlimited';

/**
 * Authored independently from module rarity. The initial values intentionally
 * follow the MVP scarcity curve, but changing rarity never changes this table.
 */
export const COOP_MODULE_POOL = {
  pulse: 4,
  'prism-slug': 2,
  needle: 4,
  'void-beam': 4,
  nova: 4,
  'geode-bloom': 2,
  overdrive: 4,
  frost: 4,
  'double-fork': 2,
  fork: 2,
  echo: 2,
  seeker: 4,
  arcbolt: 1,
  'resonant-trail': 2,
  'cinder-trail': 4,
  'starfire-trail': 2,
  'rift-trail': 1,
  razor: 2,
  ricochet: 2,
  'ember-coating': 4,
  toxin: 4,
  'searing-sigil': 2,
  'starfire-matrix': 1,
  colossus: 2,
  'focus-core': 2,
  'condense-core': 'unlimited',
  barrage: 1,
  economizer: 4,
  'emergency-battery': 4,
  'reclaim-circuit': 2,
  'proximity-mine': 2,
  'rift-barrier': 2,
  singularity: 1,
  'tesla-node': 1,
  'ember-field': 4,
  'toxic-cloud': 4,
  'impact-trigger': 'unlimited',
  'timer-trigger': 'unlimited',
  'expiration-trigger': 'unlimited',
  'terrain-trigger': 'unlimited',
} as const satisfies Record<(typeof ORCHESTRATION_MODULE_IDS)[number], CoopPoolCount>;

export const createCoopPool = (): Record<ModuleId, CoopPoolCount> => (
  Object.fromEntries(Object.entries(COOP_MODULE_POOL))
);

export const isKnownCoopModule = (moduleId: ModuleId): boolean => moduleId in COOP_MODULE_POOL;
