import type { DifficultyId } from './types';

export interface DifficultyDefinition {
  id: DifficultyId;
  rank: -2 | -1 | 0 | 1 | 2;
  signalHealth: number;
  signalSpeed: number;
  towerDamage: number;
  economy: number;
}

export const DIFFICULTIES: readonly DifficultyDefinition[] = [
  {
    id: 'relaxed',
    rank: -2,
    signalHealth: 0.72,
    signalSpeed: 0.94,
    towerDamage: 1.18,
    economy: 1.12,
  },
  {
    id: 'easy',
    rank: -1,
    signalHealth: 0.86,
    signalSpeed: 0.97,
    towerDamage: 1.08,
    economy: 1.06,
  },
  {
    id: 'normal',
    rank: 0,
    signalHealth: 1,
    signalSpeed: 1,
    towerDamage: 1,
    economy: 1,
  },
  {
    id: 'hard',
    rank: 1,
    signalHealth: 1.18,
    signalSpeed: 1.04,
    towerDamage: 0.94,
    economy: 0.96,
  },
  {
    id: 'extreme',
    rank: 2,
    signalHealth: 1.42,
    signalSpeed: 1.08,
    towerDamage: 0.86,
    economy: 0.9,
  },
] as const;

export const DEFAULT_DIFFICULTY_ID: DifficultyId = 'normal';

export function getDifficulty(id: DifficultyId): DifficultyDefinition {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id)
    ?? DIFFICULTIES.find((difficulty) => difficulty.id === DEFAULT_DIFFICULTY_ID)!;
}
