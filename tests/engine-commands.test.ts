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

  it('uses the selected level module-draft counts for opening and wave rewards', () => {
    const triune = new GameEngine({ mode: 'standard', levelId: 'triune-delta', seed: 7 });
    expect(triune.getSnapshot().draft).toMatchObject({ round: 1, totalRounds: 5 });

    const engine = new GameEngine({ mode: 'standard', levelId: 'white-prism', seed: 7 });
    for (let round = 0; round < engine.level.moduleDraft.initialPicks; round += 1) {
      const choice = engine.getSnapshot().draft?.choices[0];
      if (!choice) throw new Error(`Expected opening draft choice ${round + 1}`);
      engine.chooseDraftModule(choice);
    }
    for (const tower of engine.towers) {
      tower.slots.fill(null);
      tower.energy = 0;
      tower.energyRegen = 0;
    }
    engine.startWave();
    const expectedEnemies = engine.getWaveBlueprint(0).length;
    for (let step = 0; step < 3_000 && engine.enemies.length < expectedEnemies; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }
    engine.enemies.forEach((enemy) => { enemy.dead = true; });
    engine.update(FIXED_SIMULATION_STEP);
    const delaySteps = Math.ceil(WAVE_CLEAR_DELAY / FIXED_SIMULATION_STEP);
    for (let step = 0; step < delaySteps; step += 1) engine.update(FIXED_SIMULATION_STEP);

    expect(engine.getSnapshot().draft).toMatchObject({
      round: 1,
      totalRounds: engine.level.moduleDraft.wavePicks,
    });
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

  it('allows multiple enemies to be injected during a creative run', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });

    engine.spawnCreativeEnemy('crown');
    engine.spawnCreativeEnemy('crown');
    expect(engine.enemies.filter((enemy) => enemy.type === 'crown')).toHaveLength(2);
  });

  it('resolves an enemy impact at the rendered core endpoint', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 5 });
    engine.spawnCreativeEnemy('spark');
    const enemy = engine.enemies[0];
    if (!enemy) throw new Error('Expected a creative enemy');
    const endpoint = engine.path.pointAtDistance(engine.path.length).position;
    enemy.distance = engine.path.length - enemy.speed * FIXED_SIMULATION_STEP / 2;
    enemy.position = engine.path.pointAtDistance(enemy.distance).position;

    engine.update(FIXED_SIMULATION_STEP);

    expect(enemy.dead).toBe(true);
    expect(enemy.position).toEqual(endpoint);
    expect(engine.core).toBe(engine.maxCore - enemy.coreDamage);
  });

  it('configures creative core stability and repeats the final designed wave', () => {
    const engine = new GameEngine({
      mode: 'creative',
      levelId: 'starter-elbow',
      seed: 5,
      creative: { coreStability: 37, waveCount: 5 },
    });
    const finalDesignedWave = engine.level.waves.at(-1);

    expect(engine.getSnapshot()).toMatchObject({ core: 37, maxCore: 37, maxWaves: 5 });
    expect(engine.getCreativeSetup()).toMatchObject({ coreStability: 37, waveCount: 5 });
    expect(engine.getWaveBlueprint(0)).toEqual(engine.level.waves[0]);
    expect(engine.getWaveBlueprint(1)).toEqual(finalDesignedWave);
    expect(engine.getWaveBlueprint(2)).toEqual(finalDesignedWave);
    expect(engine.getWaveBlueprint(4)).toEqual(finalDesignedWave);

    engine.core = 1;
    engine.reset();
    expect(engine.core).toBe(37);
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
      creative: { waveCount: 2 },
    });
    engine.startWave();
    const expectedEnemies = engine.getWaveBlueprint(0).length;
    while (engine.enemies.length < expectedEnemies) engine.update(FIXED_SIMULATION_STEP);
    engine.enemies.forEach((enemy) => { enemy.dead = true; });

    engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('wave');

    const delaySteps = Math.ceil(WAVE_CLEAR_DELAY / FIXED_SIMULATION_STEP);
    for (let step = 0; step < delaySteps - 1; step += 1) engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('wave');

    engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('planning');
  });
});
