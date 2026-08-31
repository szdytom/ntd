import type { IArchiveStorage, IArchiveStorageReader, IArchiveStorageWriter } from './storage';
import type { PersistedAchievementStateV1, PersistedDefenseRecordV1 } from './types';

const DATABASE_NAME = 'prism-bastion-defense-archive';
const DATABASE_VERSION = 1;
const DEFENSES_STORE = 'defenses';
const ACHIEVEMENTS_STORE = 'achievementState';
const STORE_NAMES = [DEFENSES_STORE, ACHIEVEMENTS_STORE] as const;

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.addEventListener('success', () => resolve(request.result), { once: true });
  request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed')), { once: true });
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.addEventListener('complete', () => resolve(), { once: true });
  transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('IndexedDB transaction aborted')), { once: true });
  transaction.addEventListener('error', () => reject(transaction.error ?? new Error('IndexedDB transaction failed')), { once: true });
});

class IndexedDBArchiveTransaction implements IArchiveStorageWriter {
  constructor(private readonly transaction: IDBTransaction) {}

  getDefense(id: string): Promise<unknown | undefined> {
    return requestResult(this.transaction.objectStore(DEFENSES_STORE).get(id));
  }

  getDefenses(): Promise<unknown[]> {
    return requestResult(this.transaction.objectStore(DEFENSES_STORE).getAll());
  }

  getAchievementState(): Promise<unknown | undefined> {
    return requestResult(this.transaction.objectStore(ACHIEVEMENTS_STORE).get('profile'));
  }

  async addDefense(record: PersistedDefenseRecordV1): Promise<void> {
    await requestResult(this.transaction.objectStore(DEFENSES_STORE).add(record));
  }

  async putAchievementState(state: PersistedAchievementStateV1): Promise<void> {
    await requestResult(this.transaction.objectStore(ACHIEVEMENTS_STORE).put(state));
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      requestResult(this.transaction.objectStore(DEFENSES_STORE).clear()),
      requestResult(this.transaction.objectStore(ACHIEVEMENTS_STORE).clear()),
    ]);
  }
}

export class IndexedDBArchiveStorage implements IArchiveStorage {
  private databasePromise: Promise<IDBDatabase> | null = null;

  private database(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error('IndexedDB is unavailable'));
        return;
      }
      const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.addEventListener('upgradeneeded', () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DEFENSES_STORE)) {
          const defenses = database.createObjectStore(DEFENSES_STORE, { keyPath: 'id' });
          defenses.createIndex('endedAt', 'endedAt');
          defenses.createIndex('result', 'result');
          defenses.createIndex('levelId', 'levelId');
          defenses.createIndex('difficultyId', 'difficultyId');
        }
        if (!database.objectStoreNames.contains(ACHIEVEMENTS_STORE)) {
          database.createObjectStore(ACHIEVEMENTS_STORE, { keyPath: 'id' });
        }
      });
      request.addEventListener('success', () => resolve(request.result), { once: true });
      request.addEventListener('error', () => reject(request.error ?? new Error('Unable to open IndexedDB')), { once: true });
      request.addEventListener('blocked', () => reject(new Error('IndexedDB upgrade is blocked')), { once: true });
    });
    return this.databasePromise;
  }

  read<TResult>(operation: (reader: IArchiveStorageReader) => Promise<TResult>): Promise<TResult> {
    return this.run('readonly', operation);
  }

  write<TResult>(operation: (writer: IArchiveStorageWriter) => Promise<TResult>): Promise<TResult> {
    return this.run('readwrite', operation);
  }

  private async run<TResult>(
    mode: IDBTransactionMode,
    operation: (transaction: IndexedDBArchiveTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    const database = await this.database();
    const transaction = database.transaction([...STORE_NAMES], mode);
    const completion = transactionDone(transaction);
    try {
      const result = await operation(new IndexedDBArchiveTransaction(transaction));
      await completion;
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // A failed request may have already aborted the transaction.
      }
      void completion.catch(() => undefined);
      throw error;
    }
  }
}
