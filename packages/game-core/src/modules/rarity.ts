import type { ModuleRarity } from './types';

export interface ModuleRarityDefinition {
  targetPower: number;
  qualityPoints: number;
}

export const MODULE_RARITIES: Record<ModuleRarity, ModuleRarityDefinition> = {
  common: { targetPower: 1, qualityPoints: 1 },
  uncommon: { targetPower: 1.25, qualityPoints: 2 },
  rare: { targetPower: 1.6, qualityPoints: 3 },
  epic: { targetPower: 1.85, qualityPoints: 4 },
  legendary: { targetPower: 2.05, qualityPoints: 5 },
};

export const DRAFT_BALANCE = {
  choicesPerOffer: 4,
  abandonQualityBoost: 1.5,
  maxRetry: 2,
  qualitySharpness: 0.22,
  minimumBaseWeight: 0.01,
  recentChoiceMultiplier: 0.22,
  ownershipSlope: 0.45,
  noTrailCarrierMultiplier: 0.3,
  projectileShortageMultiplier: 2,
  dependencyImbalanceMultiplier: 1.5,
} as const;
