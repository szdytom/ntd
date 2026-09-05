import type { CSSProperties } from 'react';
import type { ModuleDefinition, ModuleKind } from '@prism-bastion/game-core/modules';
import { modulePresentationRegistry } from '../module-presentations';
import { MODULE_RARITY_PRESENTATION } from '../module-presentations/rarity';

export const MINIMUM_MODULE_UI_CONTRAST = 3;

interface RgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

const parseHexColor = (color: string): RgbColor => {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) throw new Error(`Module UI colors must use six-digit hex notation: ${color}`);
  return {
    red: Number.parseInt(match[1] ?? '', 16),
    green: Number.parseInt(match[2] ?? '', 16),
    blue: Number.parseInt(match[3] ?? '', 16),
  };
};

const linearChannel = (channel: number): number => {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ({ red, green, blue }: RgbColor): number => (
  0.2126 * linearChannel(red)
  + 0.7152 * linearChannel(green)
  + 0.0722 * linearChannel(blue)
);

export const contrastAgainstWhite = (color: string): number => (
  1.05 / (relativeLuminance(parseHexColor(color)) + 0.05)
);

export const moduleUiColor = (definition: ModuleDefinition): string => (
  modulePresentationRegistry.require(definition.id).meta.displayColor
);

export const moduleUiTint = (definition: ModuleDefinition): string => (
  modulePresentationRegistry.require(definition.id).meta.tint
);

export const KIND_SYMBOL: Record<ModuleKind, string> = {
  projectile: 'P',
  static: 'S',
  modifier: 'M',
  trail: 'T',
  logic: 'L',
};

export const moduleVariableStyle = (definition: ModuleDefinition): CSSProperties => ({
  '--module-color': moduleUiColor(definition),
  '--module-tint': moduleUiTint(definition),
  '--rarity-color': MODULE_RARITY_PRESENTATION[definition.meta.rarity].color,
  '--rarity-tint': MODULE_RARITY_PRESENTATION[definition.meta.rarity].tint,
} as CSSProperties);
