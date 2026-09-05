import { describe, expect, it } from 'vitest';
import { CoopGameController } from '@prism-bastion/coop/controller';
import { createInitialCoopPlan, hashCoopPlan } from '@prism-bastion/coop/planning';
import type { GameEvent } from '@prism-bastion/game-core/game/types';

describe('co-op combat execution', () => {
  it('captures local leaks without applying core damage', () => {
    const plan = createInitialCoopPlan('starter-elbow', 'normal', 42);
    plan.towers[0]!.slots.fill(null);
    const controller = new CoopGameController({ levelId: 'starter-elbow', difficultyId: 'normal', seed: 42 });
    const { engine } = controller;
    controller.applyPlan(plan);
    let completed: Extract<GameEvent, { type: 'combat-phase-completed' }>['result'] | null = null;
    engine.subscribe((event) => {
      if (event.type === 'combat-phase-completed') completed = event.result;
    });
    controller.startCombat({ phaseId: 1, planHash: hashCoopPlan(plan), wave: 1, kind: 'local-defense' });
    expect(controller.fastForward()).toBe(true);
    expect(engine.core).toBe(20);
    expect(completed?.leaks).toHaveLength(5);
    expect(completed?.planHash).toBe(hashCoopPlan(plan));
  });

  it('routes planning edits to the authority and locks them during combat', () => {
    const plan = createInitialCoopPlan('starter-elbow', 'normal', 43);
    const controller = new CoopGameController({ levelId: 'starter-elbow', difficultyId: 'normal', seed: 43 });
    const { engine } = controller;
    controller.applyPlan(plan);
    const commands: string[] = [];
    controller.setCommandSink((command) => commands.push(command.type));
    engine.placeTower(1);
    expect(commands).toEqual(['place-tower']);
    controller.startCombat({ phaseId: 1, planHash: hashCoopPlan(plan), wave: 1, kind: 'local-defense' });
    engine.placeTower(1);
    engine.setSpeed(2);
    engine.togglePause();
    expect(commands).toEqual(['place-tower']);
    expect(engine.speed).toBe(1);
    expect(engine.paused).toBe(false);
  });
});
