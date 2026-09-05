import { GameEngine, type CombatPhaseInput, type GamePlanningCommand, type VisualFeedbackSink } from '@prism-bastion/game-core';
import type { DifficultyId } from '@prism-bastion/game-core/game/types';
import type { SessionRules } from '@prism-bastion/game-core/game/session-rules';
import type { CoopPlayerPlan, CoopPlanningCommand } from './types';

export const COOP_SESSION_RULES: SessionRules = Object.freeze({
  setup: 'standard', inventory: 'limited', rewards: 'none', economy: 'limited',
  waves: 'level', core: 'standard', signalScaling: 'level', scenarioControls: 'none', archive: 'none',
});

export interface CoopGameControllerOptions {
  levelId: string;
  difficultyId: DifficultyId;
  seed?: number;
  visuals?: VisualFeedbackSink;
}

/** Converts co-op protocol plans and commands into the core's neutral external-control API. */
export class CoopGameController {
  readonly engine: GameEngine;

  constructor(options: CoopGameControllerOptions) {
    this.engine = new GameEngine({
      mode: 'standard', levelId: options.levelId, difficultyId: options.difficultyId,
      seed: options.seed ?? 0, rules: COOP_SESSION_RULES, externalControl: true,
      ...(options.visuals ? { visuals: options.visuals } : {}),
    });
  }

  setCommandSink(sink: ((command: CoopPlanningCommand) => void) | null): void {
    this.engine.setCommandSink(sink as ((command: GamePlanningCommand) => void) | null);
  }

  setPlanningEnabled(enabled: boolean): void { this.engine.setPlanningEnabled(enabled); }
  applyPlan(plan: CoopPlayerPlan): void { this.engine.applyGamePlan(plan); }
  synchronizeShards(shards: number): void { this.engine.synchronizeShards(shards); }
  startCombat(input: CombatPhaseInput): void { this.engine.startCombatPhase(input); }
  fastForward(maxTicks?: number): boolean { return this.engine.fastForwardCombatPhase(maxTicks); }
}
