import type { CSSProperties } from 'react';
import { MODULE_RARITIES, type ModuleDefinition, type ModuleKind } from '../modules';

export const KIND_SYMBOL: Record<ModuleKind, string> = {
  projectile: 'P',
  static: 'S',
  modifier: 'M',
  trail: 'T',
  logic: 'L',
};

export const moduleVariableStyle = (definition: ModuleDefinition): CSSProperties => ({
  '--module-color': definition.meta.color,
  '--module-tint': definition.meta.tint,
  '--rarity-color': MODULE_RARITIES[definition.meta.rarity].color,
  '--rarity-tint': MODULE_RARITIES[definition.meta.rarity].tint,
} as CSSProperties);
