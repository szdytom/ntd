import type { DifficultyId, SignalOutcomeTally, SignalVariantId } from '@prism-bastion/game-core/game/types';
import { LEVELS } from '@prism-bastion/game-core/game/config';
import type {
  AggregateStats,
  DefenseRecord,
  DefenseArchiveAnalytics,
  SectorStats,
  SignalStats,
  WaveStats,
} from './types';

const emptyAggregate = (): AggregateStats => ({
  defenses: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  durationSeconds: 0,
  defeated: 0,
  leaked: 0,
  remaining: 0,
  flawlessWins: 0,
  bestScore: 0,
});

const addRecord = (aggregate: AggregateStats, record: DefenseRecord): void => {
  aggregate.defenses += 1;
  aggregate.wins += Number(record.result === 'won');
  aggregate.losses += Number(record.result === 'lost');
  aggregate.durationSeconds += Math.max(0, (record.endedAt - record.startedAt) / 1000);
  aggregate.flawlessWins += Number(record.result === 'won' && record.core === record.maxCore);
  aggregate.bestScore = Math.max(aggregate.bestScore, record.score);
  for (const wave of record.waves) {
    for (const tally of Object.values(wave.signals)) {
      aggregate.defeated += tally?.defeated ?? 0;
      aggregate.leaked += tally?.leaked ?? 0;
      aggregate.remaining += tally?.remaining ?? 0;
    }
  }
  aggregate.winRate = aggregate.defenses === 0 ? 0 : aggregate.wins / aggregate.defenses;
};

const emptyTally = (): SignalOutcomeTally => ({ spawned: 0, defeated: 0, leaked: 0, remaining: 0, queued: 0, coreDamage: 0 });

const addTally = (total: SignalOutcomeTally, tally: SignalOutcomeTally | undefined): void => {
  if (!tally) return;
  for (const key of Object.keys(total) as Array<keyof SignalOutcomeTally>) total[key] += tally[key];
};

const buildSignalStats = (records: readonly DefenseRecord[]): SignalStats[] => {
  const signalMap = new Map<SignalVariantId, SignalOutcomeTally>();
  for (const record of records) {
    for (const wave of record.waves) {
      for (const [variant, tally] of Object.entries(wave.signals)) {
        const total = signalMap.get(variant as SignalVariantId) ?? emptyTally();
        addTally(total, tally);
        signalMap.set(variant as SignalVariantId, total);
      }
    }
  }
  return [...signalMap.entries()].map(([variant, tally]): SignalStats => ({
    variant,
    ...tally,
    purificationRate: tally.spawned === 0 ? 0 : tally.defeated / tally.spawned,
  }));
};

const buildWaveStats = (records: readonly DefenseRecord[], maxWaves: number): WaveStats[] => (
  Array.from({ length: maxWaves }, (_, index) => {
    const wave = index + 1;
    const attempts = records.filter((record) => record.waveReached >= wave);
    const clears = attempts.filter((record) => record.result === 'won' || record.waveReached > wave).length;
    const total = emptyTally();
    for (const record of attempts) {
      const report = record.waves.find((entry) => entry.wave === wave);
      for (const tally of Object.values(report?.signals ?? {})) addTally(total, tally);
    }
    return {
      wave,
      attempts: attempts.length,
      clears,
      failures: attempts.length - clears,
      clearRate: attempts.length === 0 ? 0 : clears / attempts.length,
      reachRate: records.length === 0 ? 0 : attempts.length / records.length,
      ...total,
      purificationRate: total.spawned === 0 ? 0 : total.defeated / total.spawned,
    };
  })
);

const buildSectorStats = (
  levelId: string,
  records: readonly DefenseRecord[],
  maxWaves: number,
): SectorStats => {
  const aggregate = emptyAggregate();
  const clearedDifficulties: DifficultyId[] = [];
  const flawlessDifficulties: DifficultyId[] = [];
  for (const record of records) {
    addRecord(aggregate, record);
    if (record.result === 'won' && !clearedDifficulties.includes(record.difficultyId)) {
      clearedDifficulties.push(record.difficultyId);
    }
    if (record.result === 'won' && record.core === record.maxCore && !flawlessDifficulties.includes(record.difficultyId)) {
      flawlessDifficulties.push(record.difficultyId);
    }
  }
  return {
    ...aggregate,
    levelId,
    clearedDifficulties,
    flawlessDifficulties,
    signals: buildSignalStats(records),
    waves: buildWaveStats(records, maxWaves),
  };
};

export function buildDefenseArchiveAnalytics(records: readonly DefenseRecord[]): DefenseArchiveAnalytics {
  const aggregate = emptyAggregate();
  for (const record of records) addRecord(aggregate, record);
  const knownLevelIds = new Set<string>(LEVELS.map((level) => level.id));
  const sectors = LEVELS.map((level) => buildSectorStats(
    level.id,
    records.filter((record) => record.levelId === level.id),
    level.waves.length,
  ));
  for (const levelId of new Set(records.map((record) => record.levelId).filter((id) => !knownLevelIds.has(id)))) {
    const sectorRecords = records.filter((record) => record.levelId === levelId);
    sectors.push(buildSectorStats(levelId, sectorRecords, Math.max(...sectorRecords.map((record) => record.maxWaves))));
  }

  return {
    aggregate,
    sectors,
    signals: buildSignalStats(records),
  };
}
