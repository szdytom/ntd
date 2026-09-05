import { describe, expect, it } from 'vitest';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import { getSessionRules } from '@prism-bastion/game-core/game/session-rules';

describe('session rules', () => {
  it('describes standard sessions without changing their mode identity', () => {
    const rules = getSessionRules('standard', false);

    expect(rules).toEqual({
      setup: 'standard',
      inventory: 'limited',
      rewards: 'draft',
      economy: 'limited',
      waves: 'level',
      core: 'standard',
      signalScaling: 'level',
      scenarioControls: 'none',
      archive: 'standard',
    });
    expect(Object.isFrozen(rules)).toBe(true);
  });

  it('represents the tutorial as a standard rule variant', () => {
    const engine = new GameEngine({ mode: 'standard', levelId: 'starter-elbow', seed: 5 });

    expect(engine.mode).toBe('standard');
    expect(engine.tutorialEnabled).toBe(true);
    expect(engine.rules).toMatchObject({
      setup: 'tutorial',
      inventory: 'limited',
      rewards: 'none',
      archive: 'standard',
    });
  });

  it('describes creative capabilities independently from mode checks', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });

    expect(engine.mode).toBe('creative');
    expect(engine.rules).toEqual({
      setup: 'creative',
      inventory: 'unlimited',
      rewards: 'none',
      economy: 'unlimited',
      waves: 'configured',
      core: 'configured',
      signalScaling: 'configured',
      scenarioControls: 'creative',
      archive: 'none',
    });
  });
});
