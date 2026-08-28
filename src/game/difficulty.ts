import type { DifficultyId } from './types';

export interface DifficultyDefinition {
  id: DifficultyId;
  name: string;
  rank: -2 | -1 | 0 | 1 | 2;
  description: string;
  enemyHealth: number;
  enemySpeed: number;
  towerDamage: number;
  economy: number;
}

export const DIFFICULTIES: readonly DifficultyDefinition[] = [
  {
    id: 'relaxed',
    name: '休闲',
    rank: -2,
    description: '专注尝试模块组合，战线容错充足。',
    enemyHealth: 0.72,
    enemySpeed: 0.94,
    towerDamage: 1.18,
    economy: 1.12,
  },
  {
    id: 'easy',
    name: '轻松',
    rank: -1,
    description: '降低构筑压力，仍保留完整成长节奏。',
    enemyHealth: 0.86,
    enemySpeed: 0.97,
    towerDamage: 1.08,
    economy: 1.06,
  },
  {
    id: 'normal',
    name: '正常',
    rank: 0,
    description: '使用策划基线数值与标准经济曲线。',
    enemyHealth: 1,
    enemySpeed: 1,
    towerDamage: 1,
    economy: 1,
  },
  {
    id: 'hard',
    name: '困难',
    rank: 1,
    description: '要求更紧凑的覆盖与更高效的模块编排。',
    enemyHealth: 1.18,
    enemySpeed: 1.04,
    towerDamage: 0.94,
    economy: 0.96,
  },
  {
    id: 'extreme',
    name: '极限',
    rank: 2,
    description: '显著提高数值压力，留给成熟构筑挑战。',
    enemyHealth: 1.42,
    enemySpeed: 1.08,
    towerDamage: 0.86,
    economy: 0.9,
  },
] as const;

export const DEFAULT_DIFFICULTY_ID: DifficultyId = 'normal';

export function getDifficulty(id: DifficultyId): DifficultyDefinition {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id)
    ?? DIFFICULTIES.find((difficulty) => difficulty.id === DEFAULT_DIFFICULTY_ID)!;
}
