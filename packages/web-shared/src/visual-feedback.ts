import type { VisualFeedbackSink } from '@prism-bastion/game-core';
import { EffectEngine } from './effects/engine';
import { gameEffects } from './effects/game-effects';
import { modulePresentationRegistry } from './module-presentations';

export function createWebVisualFeedback(): EffectEngine & VisualFeedbackSink {
  const engine = new EffectEngine().registerMany(gameEffects);
  modulePresentationRegistry.registerEffects(engine);
  return engine;
}
