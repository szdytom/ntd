import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine, WAVE_CLEAR_DELAY } from '../src/game/engine';

describe('engine command and view boundary', () => {
  it('starts standard levels with three rounds of four-choice module drafts', () => {
    const engine = new GameEngine({ mode: 'standard', seed: 5 });

    expect(engine.getSnapshot()).toMatchObject({
      status: 'reward',
      wave: 0,
      draft: { round: 1, totalRounds: 3 },
    });
    expect(engine.getSnapshot().draft?.choices).toHaveLength(4);

    for (let round = 1; round <= 3; round += 1) {
      const choice = engine.getSnapshot().draft?.choices[0];
      if (!choice) throw new Error(`Expected a module choice in draft round ${round}`);
      engine.chooseDraftModule(choice);
    }

    expect(engine.getSnapshot().status).toBe('planning');
    expect(engine.getSnapshot().draft).toBeNull();
  });

  it('publishes an immutable selected-tower snapshot', () => {
    const engine = new GameEngine({ mode: 'standard', seed: 5 });
    const towerId = engine.towers[0].id;
    engine.selectTower(towerId);
    const first = engine.getViewSnapshot();

    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.selectedTower)).toBe(true);
    expect(Object.isFrozen(first.selectedTower?.slots)).toBe(true);

    engine.setTargeting('hp-highest');
    const second = engine.getViewSnapshot();
    expect(second).not.toBe(first);
    expect(second.selectedTower?.targeting).toBe('hp-highest');
  });

  it('rejects invalid slot commands and unknown modules', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    engine.selectTower(engine.towers[0].id);
    const before = [...engine.towers[0].slots];

    engine.swapModules(-1, 99);
    engine.installModule(0, 'not-registered');

    expect(engine.towers[0].slots).toEqual(before);
  });

  it('enforces the single-boss invariant in setup and live spawning', () => {
    const engine = new GameEngine({
      mode: 'creative',
      seed: 5,
      creative: { wave: { crown: 40 } },
    });

    expect(engine.getCreativeSetup().wave.crown).toBe(1);
    engine.spawnCreativeEnemy('crown');
    engine.spawnCreativeEnemy('crown');
    expect(engine.enemies.filter((enemy) => enemy.type === 'crown')).toHaveLength(1);
  });

  it('keeps creative-mode shards infinite across spending and reset', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    expect(engine.shards).toBe(Number.POSITIVE_INFINITY);

    engine.placeTower(1);
    engine.selectTower(engine.towers[0].id);
    engine.upgradeSelectedTower();
    expect(engine.shards).toBe(Number.POSITIVE_INFINITY);
    expect(engine.getSnapshot().shards).toBe(Number.POSITIVE_INFINITY);

    engine.reset();
    expect(engine.shards).toBe(Number.POSITIVE_INFINITY);
  });

  it('waits two seconds after the battlefield clears before advancing', () => {
    const engine = new GameEngine({
      mode: 'creative',
      levelId: 'starter-elbow',
      seed: 5,
      creative: { wave: { spark: 1, kite: 0, block: 0, hex: 0, crown: 0 } },
    });
    engine.startWave();
    while (engine.enemies.length === 0) engine.update(FIXED_SIMULATION_STEP);
    const enemy = engine.enemies[0];
    if (!enemy) throw new Error('Expected the wave enemy to spawn');
    enemy.dead = true;

    engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('wave');

    const delaySteps = Math.ceil(WAVE_CLEAR_DELAY / FIXED_SIMULATION_STEP);
    for (let step = 0; step < delaySteps - 1; step += 1) engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('wave');

    engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('planning');
  });
});
