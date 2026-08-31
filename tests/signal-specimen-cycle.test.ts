import { describe, expect, it } from 'vitest';
import {
  advanceArchiveShieldCycle,
  archiveShieldProjectileProgress,
  ARCHIVE_SHIELD_HIT_INTERVAL,
  ARCHIVE_SHIELD_PROJECTILE_FLIGHT,
  ARCHIVE_SHIELD_RESTORE_DELAY,
  createArchiveShieldCycle,
} from '../src/signals/archive/specimen-cycle';

describe('compendium shield cycle', () => {
  it('launches every two seconds, breaks on the fourth hit, and restores four seconds later', () => {
    const cycle = createArchiveShieldCycle();

    expect(archiveShieldProjectileProgress(cycle)).toBeNull();
    expect(advanceArchiveShieldCycle(cycle, ARCHIVE_SHIELD_HIT_INTERVAL - ARCHIVE_SHIELD_PROJECTILE_FLIGHT)).toBeNull();
    expect(archiveShieldProjectileProgress(cycle)).toBeCloseTo(0);
    expect(advanceArchiveShieldCycle(cycle, ARCHIVE_SHIELD_PROJECTILE_FLIGHT / 2)).toBeNull();
    expect(archiveShieldProjectileProgress(cycle)).toBeCloseTo(0.5);
    expect(advanceArchiveShieldCycle(cycle, ARCHIVE_SHIELD_PROJECTILE_FLIGHT / 2)).toBe('hit');
    expect(archiveShieldProjectileProgress(cycle)).toBeNull();
    expect(cycle.rippleAge).toBe(0);
    expect(advanceArchiveShieldCycle(cycle, 0.2)).toBeNull();
    expect(cycle.rippleAge).toBeCloseTo(0.2);
    expect(advanceArchiveShieldCycle(cycle, ARCHIVE_SHIELD_HIT_INTERVAL - 0.2)).toBe('hit');
    expect(advanceArchiveShieldCycle(cycle, ARCHIVE_SHIELD_HIT_INTERVAL)).toBe('hit');
    expect(advanceArchiveShieldCycle(cycle, ARCHIVE_SHIELD_HIT_INTERVAL)).toBe('break');
    expect(cycle.active).toBe(false);
    expect(cycle.radiusScale).toBe(0);

    expect(advanceArchiveShieldCycle(cycle, ARCHIVE_SHIELD_RESTORE_DELAY - 0.01)).toBeNull();
    expect(advanceArchiveShieldCycle(cycle, 0.01)).toBe('restore');
    expect(cycle.active).toBe(true);
    expect(cycle.radiusScale).toBe(0.15);
    expect(cycle.rippleAge).toBe(0);
  });
});
