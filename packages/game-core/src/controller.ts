import type { GameEvent, GamePlanningCommand, GameViewSnapshot } from './game/types';

/** The mode-neutral control surface consumed by browser applications. */
export interface GameController {
  readonly subscribeView: (listener: () => void) => () => void;
  readonly getViewSnapshot: () => GameViewSnapshot;
  subscribe(listener: (event: GameEvent) => void): () => void;
  setCommandSink(sink: ((command: GamePlanningCommand) => void) | null): void;
}
