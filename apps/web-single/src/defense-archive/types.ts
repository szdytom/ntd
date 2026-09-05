import type {
  DefenseCompletedReport,
  DifficultyId,
  SignalOutcomeTally,
  SignalId,
  SignalVariantId,
  DefenseArchiveFact,
} from '@prism-bastion/game-core/game/types';

export const DEFENSE_ARCHIVE_SCHEMA_VERSION = 1;

export interface DefenseRecord extends DefenseCompletedReport {
  id: string;
  schemaVersion: typeof DEFENSE_ARCHIVE_SCHEMA_VERSION;
  build: {
    commit: string;
    commitDate: string;
  };
}

/** IndexedDB v1 wire shape. Legacy field names are isolated to persistence. */
export interface PersistedDefenseRecordV1 extends Omit<DefenseRecord, 'waves'> {
  waves: readonly {
    wave: number;
    enemies: Readonly<Partial<Record<SignalVariantId, SignalOutcomeTally>>>;
  }[];
}

export type AchievementCategory = 'tutorial' | 'progress' | 'challenge';

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  progress(state: AchievementState): { current: number; target: number };
}

export interface AchievementProgress {
  id: string;
  category: AchievementCategory;
  current: number;
  target: number;
  unlockedAt: number | null;
}

export interface AchievementState {
  id: 'profile';
  schemaVersion: typeof DEFENSE_ARCHIVE_SCHEMA_VERSION;
  tutorialFacts: DefenseArchiveFact[];
  challengeFacts: DefenseArchiveFact[];
  tutorialCompleted: boolean;
  standardDefeated: number;
  defeatedSignalIds: SignalId[];
  clears: Partial<Record<DifficultyId, string[]>>;
  flawlessClears: Partial<Record<DifficultyId, string[]>>;
  challengeWins: Array<'single-tower' | 'level-one'>;
  unlockedAt: Record<string, number>;
}

/** IndexedDB v1 wire shape. */
export interface PersistedAchievementStateV1 extends Omit<AchievementState, 'defeatedSignalIds'> {
  defeatedTypes: SignalId[];
}

export interface DefenseArchiveSnapshot {
  defenses: DefenseRecord[];
  achievements: AchievementProgress[];
  warningCount: number;
}

export interface AggregateStats {
  defenses: number;
  wins: number;
  losses: number;
  winRate: number;
  durationSeconds: number;
  defeated: number;
  leaked: number;
  remaining: number;
  flawlessWins: number;
  bestScore: number;
}

export interface WaveStats {
  wave: number;
  attempts: number;
  clears: number;
  failures: number;
  clearRate: number;
  reachRate: number;
  spawned: number;
  defeated: number;
  leaked: number;
  remaining: number;
  queued: number;
  coreDamage: number;
  purificationRate: number;
}

export interface SectorStats extends AggregateStats {
  levelId: string;
  clearedDifficulties: DifficultyId[];
  flawlessDifficulties: DifficultyId[];
  signals: SignalStats[];
  waves: WaveStats[];
}

export interface SignalStats extends SignalOutcomeTally {
  variant: SignalVariantId;
  purificationRate: number;
}

export interface DefenseArchiveAnalytics {
  aggregate: AggregateStats;
  sectors: SectorStats[];
  signals: SignalStats[];
}

export const createAchievementState = (): AchievementState => ({
  id: 'profile',
  schemaVersion: DEFENSE_ARCHIVE_SCHEMA_VERSION,
  tutorialFacts: [],
  challengeFacts: [],
  tutorialCompleted: false,
  standardDefeated: 0,
  defeatedSignalIds: [],
  clears: {},
  flawlessClears: {},
  challengeWins: [],
  unlockedAt: {},
});
