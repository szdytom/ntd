import { describe, expect, it } from 'vitest';
import { createSeededRandom, rollTowerStats, TOWER_STAT_BUDGET } from '@prism-bastion/game-core/game/tower-generation';

describe('tower generation', () => {
  it('is deterministic for a seed', () => {
    expect(rollTowerStats(createSeededRandom(12345))).toEqual(rollTowerStats(createSeededRandom(12345)));
  });

  it('spends the complete fixed budget and produces usable stats', () => {
    for (let seed = 0; seed < 1_000; seed += 1) {
      const stats = rollTowerStats(createSeededRandom(seed));
      const spent = stats.allocation.capacity
        + stats.allocation.regeneration
        + stats.allocation.cooldown
        + stats.allocation.slots
        + stats.allocation.range;

      expect(spent).toBe(TOWER_STAT_BUDGET);
      expect(Number.isInteger(stats.slotCount)).toBe(true);
      expect(stats.slotCount).toBeGreaterThan(0);
      expect(stats.cooldown).toBeGreaterThan(0);
      expect(stats.maxEnergy).toBeGreaterThan(0);
      expect(stats.energyRegen).toBeGreaterThan(0);
      expect(stats.range).toBeGreaterThan(0);
    }
  });
});
