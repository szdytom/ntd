export { ACHIEVEMENTS, evaluateAchievements } from './achievements';
export { buildDefenseArchiveAnalytics } from './analytics';
import { IndexedDBArchiveStorage } from './indexed-db-storage';
import { DefenseArchiveRepository } from './repository';

export { DefenseArchiveRepository, IndexedDBArchiveStorage };
export type { IArchiveStorage, IArchiveStorageReader, IArchiveStorageWriter } from './storage';
export const defenseArchiveRepository = new DefenseArchiveRepository(new IndexedDBArchiveStorage());
export type {
  AchievementProgress,
  DefenseRecord,
  DefenseArchiveAnalytics,
  DefenseArchiveSnapshot,
  SectorStats,
  SignalStats,
  WaveStats,
} from './types';
