import { describe, expect, it } from 'vitest';
import { calculateWaveBalanceRows, sampleTowerStatAverages } from '../src/game/balance-analysis';

describe('executable balance documentation', () => {
  it('keeps deterministic tower averages within the documented rounding', () => {
    const averages = sampleTowerStatAverages(100_000);

    expect(averages.maxEnergy).toBeCloseTo(135.35, 2);
    expect(averages.energyRegen).toBeCloseTo(14.87, 2);
    expect(averages.cooldown).toBeCloseTo(1.02, 2);
    expect(averages.slotCount).toBeCloseTo(4.02, 2);
    expect(averages.range).toBeCloseTo(201.67, 2);
  });

  it('reproduces documented wave rows directly from configuration', () => {
    const rows = calculateWaveBalanceRows();
    const first = rows.find((row) => row.levelId === 'white-prism' && row.wave === 1);
    const last = rows.find((row) => row.levelId === 'verdant-fold' && row.wave === 7);
    const triune = rows.find((row) => row.levelId === 'triune-delta' && row.wave === 1);

    expect(first).toMatchObject({ units: 7, effectiveHp: 828, income: 108 });
    expect(first?.spawnDuration).toBeCloseTo(3.75, 2);
    expect(last).toMatchObject({ units: 18, effectiveHp: 7_850, income: 322 });
    expect(triune).toMatchObject({ units: 54, entranceFlow: {
      'north-entry': 18,
      'center-entry': 18,
      'south-entry': 18,
    } });
  });
});
