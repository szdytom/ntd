import type { TFunction } from 'i18next';
import type { DifficultyId, SignalId, SignalVariantId, ModuleId } from '@prism-bastion/game-core/game/types';
import { signalRegistry } from '@prism-bastion/game-core/signals';
import type { ModuleDefinition, ModuleKind, ModuleRarity, ModuleTextValues } from '@prism-bastion/game-core/modules/types';

const MAX_DISPLAY_FRACTION_DIGITS = 3;

export const formatDisplayNumber = (value: number): number => {
  if (!Number.isFinite(value)) return value;
  const rounded = Number(value.toFixed(MAX_DISPLAY_FRACTION_DIGITS));
  return Object.is(rounded, -0) ? 0 : rounded;
};

const textOptions = (values?: ModuleTextValues): Record<string, string | number> => {
  if (!values) return {};
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key,
    typeof value === 'number' ? formatDisplayNumber(value) : value,
  ]));
};

export const moduleName = (t: TFunction, id: ModuleId): string => t(`modules.${id}.name`);
export const moduleShortName = (t: TFunction, id: ModuleId): string => t(`modules.${id}.short`);
export const moduleDescription = (t: TFunction, definition: ModuleDefinition): string => (
  t(`modules.${definition.id}.description`, textOptions(definition.meta.text?.description))
);
export const moduleDetail = (t: TFunction, definition: ModuleDefinition): string => (
  t(`modules.${definition.id}.detail`, textOptions(definition.meta.text?.detail))
);
export const signalName = (t: TFunction, type: SignalId): string => t(signalRegistry.require(type).text.nameKey);
export const signalVariantName = (t: TFunction, variantId: SignalVariantId): string => {
  const variant = signalRegistry.variant(variantId);
  return t(variant?.text.nameKey ?? signalRegistry.require(signalRegistry.signalIdForVariant(variantId)).text.nameKey);
};
export const levelName = (t: TFunction, id: string): string => t(`levels.${id}.name`);
export const levelDescription = (t: TFunction, id: string): string => t(`levels.${id}.description`);
export const difficultyName = (t: TFunction, id: DifficultyId): string => t(`difficulties.${id}.name`);
export const kindLabel = (t: TFunction, kind: ModuleKind): string => t(`kinds.${kind}`);
export const rarityLabel = (t: TFunction, rarity: ModuleRarity): string => t(`rarities.${rarity}`);
