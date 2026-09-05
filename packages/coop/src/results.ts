import type { CoopCombatResult } from './types';

export function combatResultsMatch(expected: CoopCombatResult, claimed: CoopCombatResult): boolean {
  if (
    expected.phaseId !== claimed.phaseId
    || expected.planHash !== claimed.planHash
    || expected.shardsEarned !== claimed.shardsEarned
    || expected.leaks.length !== claimed.leaks.length
  ) return false;
  return expected.leaks.every((leak, index) => {
    const candidate = claimed.leaks[index];
    return candidate?.ordinal === leak.ordinal
      && candidate.type === leak.type
      && candidate.entrance === leak.entrance;
  });
}
