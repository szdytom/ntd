import type { ORCHESTRATION_MODULE_IDS } from '@prism-bastion/game-core/game/orchestration-codec';
import type { ModuleId } from '@prism-bastion/game-core/game/types';

export type CoopPoolCount = number | 'unlimited';

/**
 * Authored independently from module rarity. The initial values intentionally
 * follow the MVP scarcity curve, but changing rarity never changes this table.
 */
export const COOP_MODULE_POOL = {
  pulse: 'unlimited',
  'prism-slug': 2,
  needle: 'unlimited',
  'void-beam': 2,
  nova: 'unlimited',
  'geode-bloom': 2,
  overdrive: 2,
  frost: 'unlimited',
  'double-fork': 2,
  fork: 2,
  echo: 2,
  seeker: 2,
  arcbolt: 1,
  'resonant-trail': 1,
  'cinder-trail': 2,
  'starfire-trail': 1,
  'rift-trail': 1,
  razor: 2,
  ricochet: 2,
  'ember-coating': 2,
  toxin: 2,
  'searing-sigil': 2,
  'starfire-matrix': 1,
  colossus: 2,
  'focus-core': 2,
  'condense-core': 1,
  barrage: 1,
  economizer: 2,
  'emergency-battery': 2,
  'reclaim-circuit': 2,
  'proximity-mine': 2,
  'rift-barrier': 1,
  singularity: 1,
  'tesla-node': 1,
  'ember-field': 2,
  'toxic-cloud': 2,
  'impact-trigger': 'unlimited',
  'timer-trigger': 'unlimited',
  'expiration-trigger': 2,
  'terrain-trigger': 'unlimited',
} as const satisfies Record<(typeof ORCHESTRATION_MODULE_IDS)[number], CoopPoolCount>;

export const createCoopPool = (): Record<ModuleId, CoopPoolCount> => (
  Object.fromEntries(Object.entries(COOP_MODULE_POOL))
);

export const isKnownCoopModule = (moduleId: ModuleId): boolean => moduleId in COOP_MODULE_POOL;
