import type { AchievementState, DefenseRecord } from './types';

export interface IArchiveStorageReader {
  getDefense(id: string): Promise<unknown | undefined>;
  getDefenses(): Promise<unknown[]>;
  getAchievementState(): Promise<unknown | undefined>;
}

export interface IArchiveStorageWriter extends IArchiveStorageReader {
  addDefense(record: DefenseRecord): Promise<void>;
  putAchievementState(state: AchievementState): Promise<void>;
  clearAll(): Promise<void>;
}

/**
 * Persistence boundary for the defense archive.
 *
 * Implementations must keep each callback on one consistent snapshot. A write
 * callback must be isolated from concurrent writes and commit all mutations
 * atomically or commit none of them. Callback code should only await methods
 * supplied by the reader or writer.
 */
export interface IArchiveStorage {
  read<TResult>(operation: (reader: IArchiveStorageReader) => Promise<TResult>): Promise<TResult>;
  write<TResult>(operation: (writer: IArchiveStorageWriter) => Promise<TResult>): Promise<TResult>;
}
