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
    name: 'Relaxed',
    rank: -2,
    description: 'Explore module combinations with generous room for error.',
    enemyHealth: 0.72,
    enemySpeed: 0.94,
    towerDamage: 1.18,
    economy: 1.12,
  },
  {
    id: 'easy',
    name: 'Easy',
    rank: -1,
    description: 'Reduces build pressure while preserving progression.',
    enemyHealth: 0.86,
    enemySpeed: 0.97,
    towerDamage: 1.08,
    economy: 1.06,
  },
  {
    id: 'normal',
    name: 'Normal',
    rank: 0,
    description: 'Uses the designed baseline and standard economy.',
    enemyHealth: 1,
    enemySpeed: 1,
    towerDamage: 1,
    economy: 1,
  },
  {
    id: 'hard',
    name: 'Hard',
    rank: 1,
    description: 'Demands tighter coverage and efficient sequencing.',
    enemyHealth: 1.18,
    enemySpeed: 1.04,
    towerDamage: 0.94,
    economy: 0.96,
  },
  {
    id: 'extreme',
    name: 'Extreme',
    rank: 2,
    description: 'Raises numerical pressure for mature builds.',
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
