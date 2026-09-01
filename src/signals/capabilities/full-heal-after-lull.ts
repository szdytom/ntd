import type { FullHealAfterLullCapability } from '../types';

const HEAL_TIMER_EPSILON = 1e-9;

export interface SignalFullHealState {
  hp: number;
  maxHp: number;
  fullHealTimer?: number;
  dead: boolean;
}

export function resetSignalFullHealTimer(
  signal: SignalFullHealState,
  capability: FullHealAfterLullCapability | undefined,
  healthDamage: number,
): void {
  if (!capability || healthDamage <= 0 || signal.dead || signal.hp <= 0) return;
  signal.fullHealTimer = capability.delay;
}

export function updateSignalFullHeal(
  signal: SignalFullHealState,
  capability: FullHealAfterLullCapability | undefined,
  delta: number,
): number {
  if (!capability || signal.dead || signal.hp >= signal.maxHp) {
    delete signal.fullHealTimer;
    return 0;
  }
  const timer = signal.fullHealTimer;
  if (timer === undefined) return 0;
  const elapsed = Math.max(0, delta);
  const remaining = timer - elapsed;
  if (remaining > HEAL_TIMER_EPSILON) {
    signal.fullHealTimer = remaining;
    return 0;
  }
  const healed = signal.maxHp - signal.hp;
  signal.hp = signal.maxHp;
  delete signal.fullHealTimer;
  return healed;
}
