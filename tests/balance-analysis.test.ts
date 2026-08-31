import { describe, expect, it } from 'vitest';
import { calculateDraftBalanceRows, calculateWaveBalanceRows, sampleTowerStatAverages } from '../src/game/balance-analysis';
import { LEVELS, resolveSpawnEntrances } from '../src/game/config';

describe('balance report aggregation', () => {
  it('samples tower generation deterministically without freezing target averages', () => {
    const first = sampleTowerStatAverages(512);
    const second = sampleTowerStatAverages(512);

    expect(second).toEqual(first);
    for (const value of Object.values(first)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
    expect(() => sampleTowerStatAverages(0)).toThrow('positive integer');
  });

  it('produces one valid row per configured wave', () => {
    const rows = calculateWaveBalanceRows();
    expect(rows).toHaveLength(LEVELS.reduce((total, level) => total + level.waves.length, 0));

    for (const level of LEVELS) {
      const levelRows = rows.filter((row) => row.levelId === level.id);
      expect(levelRows).toHaveLength(level.waves.length);
      levelRows.forEach((row, index) => {
        const wave = level.waves[index];
        if (!wave) throw new Error(`Expected ${level.id} wave ${index + 1}`);
        const expandedEntries = wave.reduce(
          (total, entry) => total + resolveSpawnEntrances(entry, level.graph).length,
          0,
        );

        expect(row.wave).toBe(index + 1);
        expect(row.units).toBeGreaterThanOrEqual(expandedEntries);
        expect(row.spawnDuration).toBeGreaterThan(0);
        expect(row.effectiveHp).toBeGreaterThan(0);
        expect(row.speedPressure).toBeGreaterThan(0);
        expect(row.income).toBeGreaterThan(0);
        expect(Object.values(row.entranceFlow).reduce((sum, count) => sum + count, 0)).toBe(expandedEntries);
        expect(Object.keys(row.entranceFlow).every((entrance) => level.graph.entrances.includes(entrance))).toBe(true);
      });
    }
  });

  it('reports finite draft shares for every configured anchor and inventory sample', () => {
    const rows = calculateDraftBalanceRows();
    expect(rows).toHaveLength(LEVELS.reduce(
      (total, level) => total + level.moduleDraft.qualityAnchors.length * 3,
      0,
    ));
    for (const row of rows) {
      expect(row.qualityCenter).toBeGreaterThanOrEqual(1);
      expect(row.qualityCenter).toBeLessThanOrEqual(5);
      expect(Object.values(row.qualityShares).reduce((sum, share) => sum + share, 0)).toBeCloseTo(1);
      expect(Object.values(row.kindShares).reduce((sum, share) => sum + share, 0)).toBeCloseTo(1);
    }
  });
});
