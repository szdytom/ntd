import { describe, expect, it } from 'vitest';
import { GameEngine, FIXED_SIMULATION_STEP } from '@prism-bastion/game-core/game/engine';
import type { DefenseCompletedReport, GameEvent, DefenseArchiveFact } from '@prism-bastion/game-core/game/types';

describe('engine defense archive telemetry', () => {
  it('publishes semantic tutorial facts only after successful actions', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 13 });
    const facts: DefenseArchiveFact[] = [];
    engine.subscribe((event: GameEvent) => { if (event.type === 'defense-archive-fact') facts.push(event.fact); });
    engine.spawnCreativeSignal('spark');
    engine.selectTower(engine.towers[0]?.id ?? null);
    engine.setTargeting('hp-highest');
    engine.placeTower(1);
    engine.towers[0]?.slots.splice(0, 2, 'frost', 'pulse');
    engine.selectTower(engine.towers[0]?.id ?? null);
    engine.swapModules(0, 1);

    expect(facts).toEqual(expect.arrayContaining([
      'creative-signal-spawned',
      'targeting-mode-configured',
      'second-tower-built',
      'module-order-changed',
    ]));
  });

  it('emits one loss report with leaked, remaining, queued, inventory, and tower state', () => {
    const engine = new GameEngine({ mode: 'standard', levelId: 'starter-elbow', seed: 17 });
    let report: DefenseCompletedReport | null = null;
    engine.subscribe((event) => { if (event.type === 'defense-completed') report = event.report; });
    for (let step = 0; step < 120; step += 1) engine.update(FIXED_SIMULATION_STEP);
    engine.status = 'wave';
    engine.wave = 1;
    const entrance = engine.level.graph.entrances[0];
    if (!entrance) throw new Error('Expected an entrance');
    const access = engine as unknown as { spawnSignal(type: 'spark', routeId: string): void };
    access.spawnSignal('spark', entrance);
    access.spawnSignal('spark', entrance);
    const [leaking] = engine.signals;
    if (!leaking) throw new Error('Expected a spawned signal');
    leaking.coreDamage = engine.maxCore;
    leaking.distance = engine.routeFor(leaking.routeId).length;
    engine.update(FIXED_SIMULATION_STEP);

    expect(report).not.toBeNull();
    expect(report?.result).toBe('lost');
    expect(report?.simulationSeconds).toBeCloseTo(FIXED_SIMULATION_STEP);
    expect(report?.waves[0]?.signals.spark).toMatchObject({ spawned: 2, leaked: 1, remaining: 1 });
    expect(report?.inventory.some((entry) => entry.moduleId === 'pulse' && entry.count > 0)).toBe(true);
    expect(report?.towers[0]).toMatchObject({ level: 1, targeting: 'core-nearest' });

    engine.update(FIXED_SIMULATION_STEP);
    expect(report?.runId).toBeTruthy();
  });
});
