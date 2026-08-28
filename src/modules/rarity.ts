import type { ModuleRarity } from './types';

export interface ModuleRarityDefinition {
  label: string;
  color: string;
  tint: string;
  draftWeight: number;
  targetPower: number;
}

/**
 * Draft weight is deliberately much steeper than power. A legendary card is
 * allowed a much higher ceiling because it occupies roughly 1% of an unforced
 * category roll and still competes against three other cards in the offer.
 */
export const MODULE_RARITIES: Record<ModuleRarity, ModuleRarityDefinition> = {
  common: { label: '普通', color: '#8b8796', tint: '#f3f2f6', draftWeight: 100, targetPower: 1 },
  uncommon: { label: '优秀', color: '#00a878', tint: '#e9fbf5', draftWeight: 40, targetPower: 1.25 },
  rare: { label: '稀有', color: '#3478f6', tint: '#eaf1ff', draftWeight: 10, targetPower: 1.6 },
  legendary: { label: '传奇', color: '#ef8f00', tint: '#fff3d8', draftWeight: 2, targetPower: 2.05 },
};

export const DRAFT_BALANCE = {
  choicesPerOffer: 4,
  picksPerWave: 3,
  dryOffersBeforePity: 2,
} as const;
