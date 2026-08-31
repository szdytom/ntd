import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine, WAVE_CLEAR_DELAY } from '../src/game/engine';
import { DRAFT_BALANCE } from '../src/modules';

describe('engine command and view boundary', () => {
  it('sorts the creative module library by kind and then ascending rarity', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    const definitions = engine.getLibraryModules();
    const kindOrder = ['projectile', 'static', 'modifier', 'trail', 'logic'] as const;
    const rarityOrder = ['common', 'uncommon', 'rare', 'legendary'] as const;

    for (let index = 1; index < definitions.length; index += 1) {
      const previous = definitions[index - 1];
      const current = definitions[index];
      if (!previous || !current) continue;
      const previousKind = kindOrder.indexOf(previous.kind);
      const currentKind = kindOrder.indexOf(current.kind);
      expect(currentKind).toBeGreaterThanOrEqual(previousKind);
      if (currentKind === previousKind) {
        expect(rarityOrder.indexOf(current.meta.rarity)).toBeGreaterThanOrEqual(
          rarityOrder.indexOf(previous.meta.rarity),
        );
      }
    }
  });

  it('provides the modules needed to complete the beginner tutorial', () => {
    const engine = new GameEngine({ mode: 'standard', levelId: 'starter-elbow', seed: 5 });

    expect(engine.tutorialEnabled).toBe(true);
    expect(engine.getSnapshot()).toMatchObject({ status: 'planning', wave: 0, draft: null });
    const tutorialModules = ['pulse', 'frost', 'proximity-mine', 'impact-trigger'] as const;
    expect(engine.getLibraryModules().map((module) => module.id)).toEqual(expect.arrayContaining(tutorialModules));
    expect(engine.getModuleCount('pulse')).toBeGreaterThanOrEqual(2);
    expect(engine.getModuleCount('frost')).toBeGreaterThanOrEqual(1);
    expect(engine.towers[0]?.slots.every((slot) => slot === null)).toBe(true);

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
    const initialCore = engine.maxCore;
    for (let step = 0; step < 6_000 && engine.status === 'wave'; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }
    expect(engine.getSnapshot()).toMatchObject({ status: 'planning', wave: 1, draft: null, core: initialCore });
  });

  it('starts standard levels with the configured opening draft', () => {
    const engine = new GameEngine({ mode: 'standard', seed: 5 });

    expect(engine.getSnapshot()).toMatchObject({
      status: 'reward',
      wave: 0,
      draft: { round: 1, totalRounds: engine.level.moduleDraft.initialPicks },
    });
    expect(engine.getSnapshot().draft?.choices).toHaveLength(DRAFT_BALANCE.choicesPerOffer);

    for (let round = 1; round <= engine.level.moduleDraft.initialPicks; round += 1) {
      const choice = engine.getSnapshot().draft?.choices[0];
      if (!choice) throw new Error(`Expected a module choice in draft round ${round}`);
      engine.chooseDraftModule(choice);
    }

    expect(engine.getSnapshot().status).toBe('planning');
    expect(engine.getSnapshot().draft).toBeNull();
  });

  it('uses the selected level module-draft counts for opening and wave rewards', () => {
    const triune = new GameEngine({ mode: 'standard', levelId: 'triune-delta', seed: 7 });
    expect(triune.getSnapshot().draft).toMatchObject({
      round: 1,
      totalRounds: triune.level.moduleDraft.initialPicks,
    });

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
    for (let step = 0; step < 3_000 && engine.signals.length < expectedEnemies; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
    }
    engine.signals.forEach((signal) => { signal.dead = true; });
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

  it('allows multiple signals to be injected during a creative run', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });

    engine.spawnCreativeSignal('crown');
    engine.spawnCreativeSignal('crown');
    expect(engine.signals.filter((signal) => signal.type === 'crown')).toHaveLength(2);
  });

  it('publishes complete live signal counts for the active wave', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'triune-delta', seed: 5 });
    engine.wave = engine.level.waves.length - 1;
    engine.startWave();

    expect(engine.getSnapshot().waveSignalCounts).toEqual({
      kite: 18,
      block: 18,
      hex: 18,
      crown: 2,
      fracture: 2,
      radiant: 1,
      anvil: 1,
    });
    expect(Object.isFrozen(engine.getSnapshot().waveSignalCounts)).toBe(true);
  });

  it('decrements live signal counts after an active signal is removed', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 5 });
    engine.status = 'wave';
    engine.spawnCreativeSignal('crown');
    expect(engine.getSnapshot().waveSignalCounts).toEqual({ crown: 1 });

    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a creative signal');
    signal.dead = true;
    engine.update(FIXED_SIMULATION_STEP);

    expect(engine.getSnapshot().waveSignalCounts).toEqual({});
  });

  it('resolves a signal impact at the rendered core endpoint', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 5 });
    engine.spawnCreativeSignal('spark');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a creative signal');
    const endpoint = engine.path.pointAtDistance(engine.path.length).position;
    signal.distance = engine.path.length - signal.speed * FIXED_SIMULATION_STEP / 2;
    signal.position = engine.path.pointAtDistance(signal.distance).position;

    engine.update(FIXED_SIMULATION_STEP);

    expect(signal.dead).toBe(true);
    expect(signal.position).toEqual(endpoint);
    expect(engine.core).toBe(engine.maxCore - signal.coreDamage);
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
    while (engine.signals.length < expectedEnemies) engine.update(FIXED_SIMULATION_STEP);
    engine.signals.forEach((signal) => { signal.dead = true; });

    engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('wave');

    const delaySteps = Math.ceil(WAVE_CLEAR_DELAY / FIXED_SIMULATION_STEP);
    for (let step = 0; step < delaySteps - 1; step += 1) engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('wave');

    engine.update(FIXED_SIMULATION_STEP);
    expect(engine.status).toBe('planning');
  });
});
