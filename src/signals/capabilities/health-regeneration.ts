import type { HealthRegenerationCapability } from '../types';

export interface SignalHealthState {
  hp: number;
  maxHp: number;
  dead: boolean;
}

export function updateSignalHealthRegeneration(
  signal: SignalHealthState,
  capability: HealthRegenerationCapability | undefined,
  delta: number,
): number {
  if (!capability || signal.dead || signal.hp >= signal.maxHp) return 0;
  const healed = Math.min(
    signal.maxHp - signal.hp,
    Math.max(0, capability.rate) * Math.max(0, delta),
  );
  signal.hp += healed;
  return healed;
}
