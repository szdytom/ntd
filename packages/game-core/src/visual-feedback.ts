import type { Point } from './game/types';

export interface VisualFeedbackOptions<TData = unknown> {
  readonly position: Point;
  readonly rotation?: number;
  readonly color?: string;
  readonly data?: TData;
  readonly lifetimeScale?: number;
}

/** Runtime-neutral semantic visual output. Browser renderers may adapt it to effects. */
export interface VisualFeedbackSink {
  spawn<TData>(cue: string, options: VisualFeedbackOptions<TData>): void;
  spawnMany<TData>(cues: readonly string[], options: VisualFeedbackOptions<TData>): void;
  update(delta: number): void;
  clear(): void;
}

export function createNoopVisualFeedback(): VisualFeedbackSink {
  return {
  spawn: () => undefined,
  spawnMany: () => undefined,
  update: () => undefined,
  clear: () => undefined,
  };
}

export const NOOP_VISUAL_FEEDBACK: VisualFeedbackSink = createNoopVisualFeedback();
