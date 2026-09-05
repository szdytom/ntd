import type { CoopCombatResult, CoopLeakedSignal, CoopPlayerPlan } from './types';
import { CoopGameController } from './controller';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { DifficultyId, GameEvent } from '@prism-bastion/game-core/game/types';

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
  engine.startCombatPhase({
    phaseId,
    planHash: request.planHash,
    wave: request.wave,
    kind,
    signals,
  });
  if (!engine.fastForwardCombatPhase()) {
    throw new Error(`Combat phase ${phaseId} exceeded the simulation tick limit`);
  }
};

export function simulateAuthoritativeCombat(request: CombatVerificationRequest): CoopCombatResult {
  const controller = new CoopGameController({
    levelId: request.levelId,
    difficultyId: request.difficultyId,
    seed: 0,
  });
  const { engine } = controller;
  controller.applyPlan(request.plan);
  let result: CoopCombatResult | null = null;
  engine.subscribe((event: GameEvent) => {
    if (event.type !== 'combat-phase-completed' || event.result.phaseId !== request.phaseId) return;
    const phase = event.result;
    result = {
      phaseId: phase.phaseId,
      planHash: phase.planHash,
      shardsEarned: phase.shardsEarned,
      leaks: phase.leaks.map((leak) => ({ ...leak })),
    };
  });

  if (request.kind === 'reinforcement') {
    runPhase(engine, request, 'local-defense', Math.max(1, request.phaseId - 1), []);
    engine.synchronizeShards(request.plan.shards);
  }
  runPhase(engine, request, request.kind, request.phaseId, request.signals);
  if (!result) throw new Error(`Combat phase ${request.phaseId} completed without a result`);
  return result;
}

export interface CombatWorkerRequest {
  taskId: number;
  request: CombatVerificationRequest;
}

export type CombatWorkerResponse =
  | { taskId: number; ok: true; result: CoopCombatResult }
  | { taskId: number; ok: false; error: string };
