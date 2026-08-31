// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEVELS } from '../src/game/config';
import type { DefenseCompletedReport, DifficultyId, EnemyType } from '../src/game/types';
import {
  ACHIEVEMENTS,
  DefenseArchiveRepository,
  buildDefenseArchiveAnalytics,
  evaluateAchievements,
  type IArchiveStorage,
  type IArchiveStorageReader,
  type IArchiveStorageWriter,
  type DefenseRecord,
  type DefenseArchiveSnapshot,
} from '../src/defense-archive';
import { applyDefense, applyDefenseArchiveFact } from '../src/defense-archive/achievements';
import {
  DEFENSE_ARCHIVE_SCHEMA_VERSION,
  createAchievementState,
  type AchievementState,
} from '../src/defense-archive/types';
import { DefenseArchive } from '../src/ui/DefenseArchive';
import { SettingsPanel } from '../src/ui/SettingsPanel';

afterEach(cleanup);

const record = (patch: Partial<DefenseRecord> = {}): DefenseRecord => ({
  id: patch.id ?? 'run-1',
  schemaVersion: DEFENSE_ARCHIVE_SCHEMA_VERSION,
  runId: patch.runId ?? patch.id ?? 'run-1',
  startedAt: 1_000,
  endedAt: 61_000,
  simulationSeconds: 120,
  result: 'won',
  mode: 'standard',
  tutorial: false,
  levelId: 'white-prism',
  difficultyId: 'normal',
  waveReached: 5,
  maxWaves: 5,
  score: 1_200,
  core: 20,
  maxCore: 20,
  shards: 40,
  waves: [{ wave: 1, enemies: { spark: { spawned: 4, defeated: 3, leaked: 1, remaining: 0, queued: 0, coreDamage: 1 } } }],
  inventory: [{ moduleId: 'pulse', count: 3 }],
  towers: [{ padIndex: 0, level: 1, targeting: 'core-nearest', slots: ['frost', 'pulse', null] }],
  build: { commit: 'abc1234', commitDate: '2026-08-31' },
  ...patch,
});

class MemoryArchiveStorage implements IArchiveStorage {
  private defenses = new Map<string, DefenseRecord>();
  private achievementState: AchievementState | undefined;

  read<TResult>(operation: (reader: IArchiveStorageReader) => Promise<TResult>): Promise<TResult> {
    return operation(this.reader(this.defenses, this.achievementState));
  }

  async write<TResult>(operation: (writer: IArchiveStorageWriter) => Promise<TResult>): Promise<TResult> {
    const defenses = new Map(this.defenses);
    let achievementState = this.achievementState;
    const reader = this.reader(defenses, achievementState);
    const writer: IArchiveStorageWriter = {
      ...reader,
      addDefense: async (defense) => {
        if (defenses.has(defense.id)) throw new Error('Duplicate defense');
        defenses.set(defense.id, defense);
      },
      putAchievementState: async (state) => {
        achievementState = state;
      },
      clearAll: async () => {
        defenses.clear();
        achievementState = undefined;
      },
    };
    const result = await operation(writer);
    this.defenses = defenses;
    this.achievementState = achievementState;
    return result;
  }

  private reader(
    defenses: Map<string, DefenseRecord>,
    achievementState: AchievementState | undefined,
  ): IArchiveStorageReader {
    return {
      getDefense: async (id) => defenses.get(id),
      getDefenses: async () => [...defenses.values()],
      getAchievementState: async () => achievementState,
    };
  }
}

describe('defense archive storage boundary', () => {
  it('runs repository behavior against an injected non-IndexedDB adapter', async () => {
    const repository = new DefenseArchiveRepository(new MemoryArchiveStorage());

    await repository.recordDefense(record());
    await repository.recordDefense(record());
    expect((await repository.readSnapshot()).defenses).toHaveLength(1);

    await repository.clearAll();
    expect((await repository.readSnapshot()).defenses).toHaveLength(0);
  });
});

describe('defense archive analytics', () => {
  it('reconciles overall, sector, and signal metrics from the same records', () => {
    const analytics = buildDefenseArchiveAnalytics([
      record(),
      record({ id: 'run-2', runId: 'run-2', result: 'lost', core: 0, score: 400, levelId: 'rose-circuit' }),
    ]);

    expect(analytics.aggregate).toMatchObject({ defenses: 2, wins: 1, losses: 1, defeated: 6, leaked: 2, bestScore: 1_200 });
    expect(analytics.aggregate.winRate).toBe(.5);
    expect(analytics.sectors.find((sector) => sector.levelId === 'white-prism')).toMatchObject({ defenses: 1, wins: 1, flawlessWins: 1 });
    expect(analytics.signals.find((signal) => signal.variant === 'spark')).toMatchObject({ spawned: 8, defeated: 6, leaked: 2, purificationRate: .75 });
  });

  it('derives per-sector signal and wave clear rates from completed defenses', () => {
    const analytics = buildDefenseArchiveAnalytics([
      record({
        waves: [
          { wave: 1, enemies: { spark: { spawned: 5, defeated: 5, leaked: 0, remaining: 0, queued: 0, coreDamage: 0 } } },
          { wave: 2, enemies: { kite: { spawned: 4, defeated: 4, leaked: 0, remaining: 0, queued: 0, coreDamage: 0 } } },
        ],
      }),
      record({
        id: 'run-2',
        runId: 'run-2',
        result: 'lost',
        waveReached: 2,
        core: 0,
        waves: [
          { wave: 1, enemies: { spark: { spawned: 5, defeated: 4, leaked: 1, remaining: 0, queued: 0, coreDamage: 1 } } },
          { wave: 2, enemies: { kite: { spawned: 4, defeated: 1, leaked: 3, remaining: 0, queued: 0, coreDamage: 20 } } },
        ],
      }),
    ]);
    const sector = analytics.sectors.find((item) => item.levelId === 'white-prism');

    expect(sector?.signals.find((signal) => signal.variant === 'kite')).toMatchObject({ spawned: 8, defeated: 5, leaked: 3 });
    expect(sector?.waves[0]).toMatchObject({ attempts: 2, clears: 2, failures: 0, clearRate: 1, reachRate: 1 });
    expect(sector?.waves[1]).toMatchObject({ attempts: 2, clears: 1, failures: 1, clearRate: .5, reachRate: 1 });
    expect(sector?.waves[2]).toMatchObject({ attempts: 1, clears: 1, failures: 0, clearRate: 1, reachRate: .5 });
  });
});

describe('defense archive achievements', () => {
  it('ships the agreed 8 tutorial, 12 progress, and 4 challenge achievements', () => {
    expect(ACHIEVEMENTS.filter((item) => item.category === 'tutorial')).toHaveLength(8);
    expect(ACHIEVEMENTS.filter((item) => item.category === 'progress')).toHaveLength(12);
    expect(ACHIEVEMENTS.filter((item) => item.category === 'challenge')).toHaveLength(4);
  });

  it('allows training facts in creative mode but gates challenge facts', () => {
    const state = createAchievementState();
    applyDefenseArchiveFact(state, 'creative-signal-spawned', { standard: false, tutorial: false });
    applyDefenseArchiveFact(state, 'legendary-tower-configured', { standard: false, tutorial: false });
    let result = evaluateAchievements(state, 10);
    expect(result.progress.find((item) => item.id === 'tutorial.creative-signal')?.unlockedAt).toBe(10);
    expect(result.progress.find((item) => item.id === 'challenge.legendary-grid')?.unlockedAt).toBeNull();

    applyDefenseArchiveFact(state, 'legendary-tower-configured', { standard: true, tutorial: false });
    result = evaluateAchievements(state, 20);
    expect(result.progress.find((item) => item.id === 'challenge.legendary-grid')?.unlockedAt).toBe(20);
  });

  it('requires every non-training sector at each exact difficulty', () => {
    const state = createAchievementState();
    const sectors = LEVELS.filter((level) => level.id !== 'starter-elbow');
    sectors.forEach((level, index) => applyDefense(state, record({
      id: `normal-${index}`,
      runId: `normal-${index}`,
      levelId: level.id,
      difficultyId: 'normal',
    })));
    const progress = evaluateAchievements(state, 30).progress;
    expect(progress.find((item) => item.id === 'progress.clear.normal')?.current).toBe(sectors.length);
    expect(progress.find((item) => item.id === 'progress.clear.normal')?.unlockedAt).toBe(30);
    expect(progress.find((item) => item.id === 'progress.clear.hard')?.current).toBe(0);
  });

  it('excludes tutorial records from campaign progress', () => {
    const state = createAchievementState();
    applyDefense(state, record({ tutorial: true, levelId: 'starter-elbow' }));
    const progress = evaluateAchievements(state, 40).progress;
    expect(progress.find((item) => item.id === 'tutorial.complete')?.unlockedAt).toBe(40);
    expect(state.standardDefeated).toBe(0);
  });
});

describe('defense archive interface', () => {
  it('shows summary metrics, achievements, filters, and defense detail', async () => {
    const user = userEvent.setup();
    const snapshot: DefenseArchiveSnapshot = {
      defenses: [record()],
      achievements: evaluateAchievements(createAchievementState()).progress,
      warningCount: 0,
    };
    const repository = {
      readSnapshot: async () => snapshot,
      clearAll: async () => undefined,
    };
    render(<DefenseArchive repository={repository as never} onBack={() => undefined} />);

    expect(await screen.findByText('Completed defenses')).toBeTruthy();
    expect(document.querySelector('.signal-ledger-grid .signal-icon')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Defense sectors' }));
    expect(screen.getByRole('heading', { name: 'White Prism' })).toBeTruthy();
    expect(screen.getByText('Wave performance')).toBeTruthy();
    expect(screen.getByText('Signal outcomes recorded only in this sector')).toBeTruthy();
    expect(document.querySelector('.sector-ledger-section .signal-ledger-grid')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Achievements' }));
    expect(screen.getByText('Field training')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /Defense records/ }));
    expect(screen.getByLabelText('Result')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /White Prism/ }));
    expect(screen.getByText('Final module inventory')).toBeTruthy();
    expect(document.querySelector('.inventory-ledger .module-icon')).toBeTruthy();
    expect(screen.getByText('abc1234 · 2026-08-31')).toBeTruthy();
  });

  it('clears local data only after the same settings button is clicked twice', async () => {
    const user = userEvent.setup();
    const clearAll = vi.fn(async () => undefined);
    render(<SettingsPanel defenseArchiveRepository={{ clearAll } as never} />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Clear archive' }));
    expect(clearAll).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Clear the defense archive?' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Click again to clear everything' }));
    await waitFor(() => expect(clearAll).toHaveBeenCalledOnce());
    expect((screen.getByRole('button', { name: 'Defense archive cleared' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

// Compile-time fixture guard: persisted records must remain assignable from engine reports.
const _reportBoundary: DefenseCompletedReport = record();
const _difficultyBoundary: DifficultyId = _reportBoundary.difficultyId;
const _enemyBoundary: EnemyType = 'spark';
void _difficultyBoundary;
void _enemyBoundary;
