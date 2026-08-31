import { BUILD_COMMIT, BUILD_COMMIT_DATE } from '../build-info';
import type { DefenseCompletedReport, DefenseArchiveFact } from '../game/types';
import { applyDefense, applyDefenseArchiveFact, evaluateAchievements } from './achievements';
import type { IArchiveStorage } from './storage';
import {
  DEFENSE_ARCHIVE_SCHEMA_VERSION,
  createAchievementState,
  type AchievementState,
  type DefenseRecord,
  type DefenseArchiveSnapshot,
} from './types';

const cloneState = (state: AchievementState): AchievementState => ({
  ...state,
  tutorialFacts: [...state.tutorialFacts],
  challengeFacts: [...state.challengeFacts],
  defeatedTypes: [...state.defeatedTypes],
  clears: Object.fromEntries(Object.entries(state.clears).map(([key, values]) => [key, [...(values ?? [])]])),
  flawlessClears: Object.fromEntries(Object.entries(state.flawlessClears).map(([key, values]) => [key, [...(values ?? [])]])),
  challengeWins: [...state.challengeWins],
  unlockedAt: { ...state.unlockedAt },
});

const validDefenseRecord = (value: unknown): value is DefenseRecord => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DefenseRecord>;
  return record.schemaVersion === DEFENSE_ARCHIVE_SCHEMA_VERSION
    && typeof record.id === 'string'
    && typeof record.runId === 'string'
    && (record.result === 'won' || record.result === 'lost')
    && record.mode === 'standard'
    && typeof record.levelId === 'string'
    && Array.isArray(record.waves)
    && Array.isArray(record.inventory)
    && Array.isArray(record.towers);
};

const validAchievementState = (value: unknown): value is AchievementState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AchievementState>;
  return state.id === 'profile'
    && state.schemaVersion === DEFENSE_ARCHIVE_SCHEMA_VERSION
    && Array.isArray(state.tutorialFacts)
    && Array.isArray(state.challengeFacts)
    && typeof state.unlockedAt === 'object';
};

export class DefenseArchiveRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: IArchiveStorage) {}

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  recordFact(fact: DefenseArchiveFact, context: { standard: boolean; tutorial: boolean }): Promise<string[]> {
    return this.enqueue(() => this.storage.write(async (archive) => {
      const stored = await archive.getAchievementState();
      const state = validAchievementState(stored) ? cloneState(stored) : createAchievementState();
      applyDefenseArchiveFact(state, fact, context);
      const { newlyUnlocked } = evaluateAchievements(state);
      await archive.putAchievementState(state);
      return newlyUnlocked;
    }));
  }

  recordDefense(report: DefenseCompletedReport): Promise<string[]> {
    if (report.mode !== 'standard') return Promise.resolve([]);
    return this.enqueue(() => this.storage.write(async (archive) => {
      const existing = await archive.getDefense(report.runId);
      if (existing) return [];
      const record: DefenseRecord = {
        ...report,
        id: report.runId,
        schemaVersion: DEFENSE_ARCHIVE_SCHEMA_VERSION,
        build: { commit: BUILD_COMMIT, commitDate: BUILD_COMMIT_DATE },
      };
      const storedState = await archive.getAchievementState();
      const state = validAchievementState(storedState) ? cloneState(storedState) : createAchievementState();
      applyDefense(state, record);
      const { newlyUnlocked } = evaluateAchievements(state, report.endedAt);
      await Promise.all([
        archive.addDefense(record),
        archive.putAchievementState(state),
      ]);
      return newlyUnlocked;
    }));
  }

  readSnapshot(): Promise<DefenseArchiveSnapshot> {
    return this.enqueue(() => this.storage.read(async (archive) => {
      const [rawDefenses, rawState] = await Promise.all([archive.getDefenses(), archive.getAchievementState()]);
      const defenses = rawDefenses.filter(validDefenseRecord).sort((left, right) => right.endedAt - left.endedAt);
      const state = validAchievementState(rawState) ? cloneState(rawState) : createAchievementState();
      const { progress } = evaluateAchievements(state);
      return { defenses, achievements: progress, warningCount: rawDefenses.length - defenses.length };
    }));
  }

  clearAll(): Promise<void> {
    return this.enqueue(() => this.storage.write((archive) => archive.clearAll()));
  }
}
