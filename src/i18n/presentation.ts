import type { TFunction } from 'i18next';
import type { DifficultyId, EnemyType, ModuleId } from '../game/types';
import type { ModuleKind, ModuleRarity } from '../modules/types';

export const moduleName = (t: TFunction, id: ModuleId): string => t(`modules.${id}.name`);
export const moduleShortName = (t: TFunction, id: ModuleId): string => t(`modules.${id}.short`);
export const moduleDescription = (t: TFunction, id: ModuleId): string => t(`modules.${id}.description`);
export const moduleDetail = (t: TFunction, id: ModuleId): string => t(`modules.${id}.detail`);
export const enemyName = (t: TFunction, type: EnemyType): string => t(`enemies.${type}`);
export const levelName = (t: TFunction, id: string): string => t(`levels.${id}.name`);
export const levelDescription = (t: TFunction, id: string): string => t(`levels.${id}.description`);
export const difficultyName = (t: TFunction, id: DifficultyId): string => t(`difficulties.${id}.name`);
export const difficultyDescription = (t: TFunction, id: DifficultyId): string => t(`difficulties.${id}.description`);
export const kindLabel = (t: TFunction, kind: ModuleKind): string => t(`kinds.${kind}`);
export const rarityLabel = (t: TFunction, rarity: ModuleRarity): string => t(`rarities.${rarity}`);
