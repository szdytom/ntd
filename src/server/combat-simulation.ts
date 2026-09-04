import type { CoopCombatResult, CoopLeakedSignal, CoopPlayerPlan } from '../coop/types';
import { GameEngine } from '../game/engine';
import type { DifficultyId, GameEvent } from '../game/types';

export interface CombatVerificationRequest {
  levelId: string;
  difficultyId: DifficultyId;
  phaseId: number;
  kind: 'local-defense' | 'reinforcement';
  wave: number;
  planHash: string;
  plan: CoopPlayerPlan;
  signals: CoopLeakedSignal[];
}

export type CombatVerificationOutcome =
  | { ok: true }
  | { ok: false; reason: 'result-mismatch'; expected: CoopCombatResult }
  | { ok: false; reason: 'verification-error' | 'queue-full'; error: string };

export type VerifyCombat = (
  request: CombatVerificationRequest,
  claimed: CoopCombatResult,
  complete: (outcome: CombatVerificationOutcome) => void,
) => void;

const runPhase = (
  engine: GameEngine,
  request: CombatVerificationRequest,
  kind: 'local-defense' | 'reinforcement',
  phaseId: number,
  signals: readonly CoopLeakedSignal[],
): void => {
  engine.startCoopCombat({
    phaseId,
    planHash: request.planHash,
    wave: request.wave,
    kind,
    signals,
  });
  if (!engine.fastForwardCoopCombat()) {
    throw new Error(`Combat phase ${phaseId} exceeded the simulation tick limit`);
  }
};

export function simulateAuthoritativeCombat(request: CombatVerificationRequest): CoopCombatResult {
  const engine = new GameEngine({
    mode: 'coop',
    levelId: request.levelId,
    difficultyId: request.difficultyId,
    seed: 0,
  });
  engine.applyCoopPlan(request.plan);
  let result: CoopCombatResult | null = null;
  engine.subscribe((event: GameEvent) => {
    if (event.type !== 'coop-phase-completed' || event.phaseId !== request.phaseId) return;
    result = {
      phaseId: event.phaseId,
      planHash: event.planHash,
      shardsEarned: event.shardsEarned,
      leaks: event.leaks.map((leak) => ({ ...leak })),
    };
  });

  if (request.kind === 'reinforcement') {
    runPhase(engine, request, 'local-defense', Math.max(1, request.phaseId - 1), []);
    engine.synchronizeCoopShards(request.plan.shards);
  }
  runPhase(engine, request, request.kind, request.phaseId, request.signals);
  if (!result) throw new Error(`Combat phase ${request.phaseId} completed without a result`);
  return result;
}

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

export interface CombatWorkerRequest {
  taskId: number;
  request: CombatVerificationRequest;
}

export type CombatWorkerResponse =
  | { taskId: number; ok: true; result: CoopCombatResult }
  | { taskId: number; ok: false; error: string };
