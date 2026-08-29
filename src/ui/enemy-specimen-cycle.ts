export const ARCHIVE_SHIELD_HIT_INTERVAL = 2;
export const ARCHIVE_SHIELD_HITS_BEFORE_BREAK = 4;
export const ARCHIVE_SHIELD_RESTORE_DELAY = 4;
export const ARCHIVE_SHIELD_PROJECTILE_FLIGHT = 0.7;

export type ArchiveShieldEvent = 'hit' | 'break' | 'restore' | null;

export interface ArchiveShieldCycle {
  active: boolean;
  radiusScale: number;
  hitStrength: number;
  hitCount: number;
  eventTimer: number;
  restoreTimer: number;
  rippleAge: number;
}

export function createArchiveShieldCycle(): ArchiveShieldCycle {
  return {
    active: true,
    radiusScale: 1,
    hitStrength: 0,
    hitCount: 0,
    eventTimer: ARCHIVE_SHIELD_HIT_INTERVAL,
    restoreTimer: ARCHIVE_SHIELD_RESTORE_DELAY,
    rippleAge: Number.POSITIVE_INFINITY,
  };
}

export function advanceArchiveShieldCycle(state: ArchiveShieldCycle, delta: number): ArchiveShieldEvent {
  state.hitStrength = Math.max(0, state.hitStrength - delta * 5);
  state.rippleAge += delta;
  if (!state.active) {
    state.restoreTimer -= delta;
    if (state.restoreTimer > 0) return null;
    state.active = true;
    state.radiusScale = 0.15;
    state.hitCount = 0;
    state.eventTimer = ARCHIVE_SHIELD_HIT_INTERVAL;
    state.restoreTimer = ARCHIVE_SHIELD_RESTORE_DELAY;
    state.rippleAge = 0;
    return 'restore';
  }

  state.radiusScale += (1 - state.radiusScale) * Math.min(1, delta * 7);
  state.eventTimer -= delta;
  if (state.eventTimer > 0) return null;
  state.eventTimer += ARCHIVE_SHIELD_HIT_INTERVAL;
  state.hitCount += 1;
  if (state.hitCount >= ARCHIVE_SHIELD_HITS_BEFORE_BREAK) {
    state.active = false;
    state.radiusScale = 0;
    state.restoreTimer = ARCHIVE_SHIELD_RESTORE_DELAY;
    state.rippleAge = 0;
    return 'break';
  }

  state.hitStrength = 1;
  state.rippleAge = 0;
  return 'hit';
}

export function archiveShieldProjectileProgress(state: ArchiveShieldCycle): number | null {
  if (!state.active || state.eventTimer > ARCHIVE_SHIELD_PROJECTILE_FLIGHT) return null;
  return Math.max(0, Math.min(1, 1 - state.eventTimer / ARCHIVE_SHIELD_PROJECTILE_FLIGHT));
}
