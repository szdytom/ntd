import type { ModuleRarity } from '@prism-bastion/game-core/modules';

export const MODULE_RARITY_PRESENTATION: Record<ModuleRarity, { readonly color: string; readonly tint: string }> = {
  common: { color: '#8b8796', tint: '#f3f2f6' },
  uncommon: { color: '#00a878', tint: '#e9fbf5' },
  rare: { color: '#3478f6', tint: '#eaf1ff' },
  epic: { color: '#a51fc4', tint: '#f8e8fc' },
  legendary: { color: '#ef8f00', tint: '#fff3d8' },
};
