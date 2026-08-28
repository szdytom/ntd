import { describe, expect, it } from 'vitest';
import { createSeededRandom, rollTowerStats, TOWER_STAT_BUDGET } from '../src/game/tower-generation';

describe('tower generation', () => {
  it('is deterministic for a seed', () => {
    expect(rollTowerStats(createSeededRandom(12345))).toEqual(rollTowerStats(createSeededRandom(12345)));
  });

  it('spends the complete fixed budget and respects stat bounds', () => {
    for (let seed = 0; seed < 1_000; seed += 1) {
      const stats = rollTowerStats(createSeededRandom(seed));
      const spent = stats.allocation.capacity
        + stats.allocation.regeneration
        + stats.allocation.cooldown
        + stats.allocation.slots
        + stats.allocation.range;

      expect(spent).toBe(TOWER_STAT_BUDGET);
      expect(stats.slotCount).toBeGreaterThanOrEqual(3);
      expect(stats.slotCount).toBeLessThanOrEqual(6);
      expect(stats.cooldown).toBeGreaterThanOrEqual(0.82);
    }
  });
});
