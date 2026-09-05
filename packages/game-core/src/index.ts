export { GameEngine } from './game/engine';
export { CombatRuntime } from './game/combat-runtime';
export type { GameController } from './controller';
export type { RenderWorld } from './game/render-world';
export type {
  CombatPhaseInput,
  CombatPhaseResult,
  GameEvent,
  GameNotice,
  GamePlan,
  GamePlanningCommand,
} from './game/types';
export { NOOP_VISUAL_FEEDBACK, createNoopVisualFeedback } from './visual-feedback';
export type { VisualFeedbackSink } from './visual-feedback';
