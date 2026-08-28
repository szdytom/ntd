import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine, WAVE_CLEAR_DELAY } from '../src/game/engine';

describe('engine command and view boundary', () => {
  it('starts the beginner level with a fixed four-module tutorial loadout', () => {
    const engine = new GameEngine({ mode: 'standard', levelId: 'starter-elbow', seed: 5 });

    expect(engine.tutorialEnabled).toBe(true);
    expect(engine.getSnapshot()).toMatchObject({ status: 'planning', wave: 0, draft: null });
    expect(engine.towers[0]?.slots).toEqual([null, null, null, null]);
    expect(engine.getLibraryModules().map((module) => module.id)).toEqual([
      'pulse',
      'frost',
      'proximity-mine',
      'impact-trigger',
    ]);
    expect(engine.getModuleCount('pulse')).toBe(2);
    expect(engine.getModuleCount('frost')).toBe(1);
    expect(engine.getModuleCount('impact-trigger')).toBe(1);
    expect(engine.getModuleCount('proximity-mine')).toBe(1);

    const firstTower = engine.towers[0];
    if (!firstTower) throw new Error('Expected the tutorial tower');
    engine.selectTower(firstTower.id);
    engine.installModule(0, 'frost');
    engine.installModule(1, 'pulse');
    engine.selectTower(null);
    engine.placeTower(1);
    engine.installModule(0, 'pulse');
    engine.selectTower(null);
    engine.startWave();
    for (let step = 0; step < 6_000 && engine.status === 'wave'; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }
    expect(engine.getSnapshot()).toMatchObject({ status: 'planning', wave: 1, draft: null, core: 20 });
  });

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

  it('allows multiple crown enemies in setup and live spawning', () => {
    const engine = new GameEngine({
      mode: 'creative',
      seed: 5,
      creative: { wave: { crown: 40 } },
    });

    expect(engine.getCreativeSetup().wave.crown).toBe(40);
    engine.spawnCreativeEnemy('crown');
    engine.spawnCreativeEnemy('crown');
    expect(engine.enemies.filter((enemy) => enemy.type === 'crown')).toHaveLength(2);
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
