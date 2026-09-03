import type { ModuleRarity } from './types';

export interface ModuleRarityDefinition {
  label: string;
  color: string;
  tint: string;
  targetPower: number;
  qualityPoints: number;
}

export const MODULE_RARITIES: Record<ModuleRarity, ModuleRarityDefinition> = {
  common: { label: 'Common', color: '#8b8796', tint: '#f3f2f6', targetPower: 1, qualityPoints: 1 },
  uncommon: { label: 'Uncommon', color: '#00a878', tint: '#e9fbf5', targetPower: 1.25, qualityPoints: 2 },
  rare: { label: 'Rare', color: '#3478f6', tint: '#eaf1ff', targetPower: 1.6, qualityPoints: 3 },
  epic: { label: 'Epic', color: '#a51fc4', tint: '#f8e8fc', targetPower: 1.85, qualityPoints: 4 },
  legendary: { label: 'Legendary', color: '#ef8f00', tint: '#fff3d8', targetPower: 2.05, qualityPoints: 5 },
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
