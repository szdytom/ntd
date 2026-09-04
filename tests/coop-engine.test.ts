import { describe, expect, it } from 'vitest';
import { createInitialCoopPlan, hashCoopPlan } from '../src/coop/planning';
import { GameEngine } from '../src/game/engine';
import type { GameEvent } from '../src/game/types';

describe('co-op combat execution', () => {
  it('captures local leaks without applying core damage', () => {
    const plan = createInitialCoopPlan('starter-elbow', 'normal', 42);
    plan.towers[0]!.slots.fill(null);
    const engine = new GameEngine({ mode: 'coop', levelId: 'starter-elbow', difficultyId: 'normal', seed: 42 });
    engine.applyCoopPlan(plan);
    let completed: Extract<GameEvent, { type: 'coop-phase-completed' }> | null = null;
    engine.subscribe((event) => {
      if (event.type === 'coop-phase-completed') completed = event;
    });
    engine.startCoopCombat({ phaseId: 1, planHash: hashCoopPlan(plan), wave: 1, kind: 'local-defense' });
    expect(engine.fastForwardCoopCombat()).toBe(true);
    expect(engine.core).toBe(20);
    expect(completed?.leaks).toHaveLength(5);
    expect(completed?.planHash).toBe(hashCoopPlan(plan));
  });

  it('routes planning edits to the authority and locks them during combat', () => {
    const plan = createInitialCoopPlan('starter-elbow', 'normal', 43);
    const engine = new GameEngine({ mode: 'coop', levelId: 'starter-elbow', difficultyId: 'normal', seed: 43 });
    engine.applyCoopPlan(plan);
    const commands: string[] = [];
    engine.setCoopCommandSink((command) => commands.push(command.type));
    engine.placeTower(1);
    expect(commands).toEqual(['place-tower']);
    engine.startCoopCombat({ phaseId: 1, planHash: hashCoopPlan(plan), wave: 1, kind: 'local-defense' });
    engine.placeTower(1);
    engine.setSpeed(2);
    engine.togglePause();
    expect(commands).toEqual(['place-tower']);
    expect(engine.speed).toBe(1);
    expect(engine.paused).toBe(false);
  });
});
