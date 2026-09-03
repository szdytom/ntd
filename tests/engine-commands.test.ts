import { describe, expect, it } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine, WAVE_CLEAR_DELAY } from '../src/game/engine';
import type { CombatEvent } from '../src/game/combat-events';
import { DRAFT_BALANCE } from '../src/modules';

describe('engine command and view boundary', () => {
  it('sorts the creative module library by kind and then ascending rarity', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    const definitions = engine.getLibraryModules();
    const kindOrder = ['projectile', 'static', 'modifier', 'trail', 'logic'] as const;
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

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

  it('offers the matching half of an opening area program', () => {
    const engine = new GameEngine({ mode: 'standard', seed: 17 });
    const firstChoices = engine.getSnapshot().draft?.choices ?? [];
    const firstHalf = firstChoices.find((moduleId) => {
      const definition = engine.modules.require(moduleId);
      return definition.kind === 'static' || definition.tags.includes('reliable-trigger');
    });
    if (!firstHalf) throw new Error('Expected an opening area-program component');

    const firstDefinition = engine.modules.require(firstHalf);
    engine.chooseDraftModule(firstHalf);
    const secondChoices = engine.getSnapshot().draft?.choices ?? [];
    expect(secondChoices.some((moduleId) => {
      const definition = engine.modules.require(moduleId);
      return firstDefinition.kind === 'static'
        ? definition.tags.includes('reliable-trigger')
        : definition.kind === 'static';
    })).toBe(true);
  });

  it('limits abandonment, prevents consecutive use, and carries a boost across reward batches', () => {
    const engine = new GameEngine({ mode: 'standard', seed: 5 });
    expect(engine.getSnapshot().draft).toMatchObject({
      round: 1,
      boosted: false,
      canAbandon: true,
      abandonsRemaining: 2,
      diagnostics: {
        inventoryAverage: 1,
        qualityAnchor: 2,
        computedBaseline: 1.6,
        appliedBoost: 0,
        computedQuality: 1.6,
        retryCount: 0,
        maxRetry: DRAFT_BALANCE.maxRetry,
      },
    });

    const abandonedHighestQuality = engine.getSnapshot().draft?.diagnostics.highestOfferedQuality;
    engine.abandonDraft();
    expect(engine.getSnapshot().draft).toMatchObject({
      round: 2,
      boosted: true,
      canAbandon: false,
      abandonsRemaining: 1,
      diagnostics: {
        appliedBoost: DRAFT_BALANCE.abandonQualityBoost,
        computedQuality: 3.1,
        abandonedHighestQuality,
      },
    });
    engine.abandonDraft();
    expect(engine.getSnapshot().draft?.round).toBe(2);

    const choice = engine.getSnapshot().draft?.choices[0];
    if (!choice) throw new Error('Expected a boosted draft choice');
    engine.chooseDraftModule(choice);
    expect(engine.getSnapshot().draft).toMatchObject({ round: 3, boosted: false, canAbandon: true });
    engine.abandonDraft();
    expect(engine.getSnapshot()).toMatchObject({ status: 'planning', draft: null });

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
      boosted: true,
      canAbandon: false,
      abandonsRemaining: 0,
    });
  });

  it('never offers an abandonment whose boost cannot reach another draft', () => {
    const source = new GameEngine({ mode: 'standard', levelId: 'white-prism', seed: 3 }).level;
    const engine = new GameEngine({
      mode: 'standard',
      seed: 3,
      level: {
        ...source,
        id: 'terminal-draft-test',
        waves: [[], []],
        moduleDraft: {
          ...source.moduleDraft,
          initialPicks: 1,
          wavePicks: 1,
          qualityAnchors: [2, 3],
          abandonLimit: 1,
        },
      },
    });

    const openingChoice = engine.getSnapshot().draft?.choices[0];
    if (!openingChoice) throw new Error('Expected an opening choice');
    engine.chooseDraftModule(openingChoice);
    engine.startWave();
    const delaySteps = Math.ceil(WAVE_CLEAR_DELAY / FIXED_SIMULATION_STEP) + 2;
    for (let step = 0; step < delaySteps; step += 1) engine.update(FIXED_SIMULATION_STEP);

    expect(engine.getSnapshot()).toMatchObject({
      status: 'reward',
      wave: 1,
      maxWaves: 2,
      draft: { round: 1, totalRounds: 1, canAbandon: false, abandonsRemaining: 1 },
    });
    const terminalOffer = engine.getSnapshot().draft;
    engine.abandonDraft();
    expect(engine.getSnapshot().draft).toEqual(terminalOffer);
  });

  it('retries a boosted offer when its best quality initially falls below the abandoned offer', () => {
    let retriedDraft: NonNullable<ReturnType<GameEngine['getSnapshot']>['draft']> | null = null;
    for (let seed = 1; seed <= 200 && !retriedDraft; seed += 1) {
      const engine = new GameEngine({ mode: 'standard', seed });
      engine.abandonDraft();
      const draft = engine.getSnapshot().draft;
      if (draft && draft.diagnostics.retryCount > 0) retriedDraft = draft;
    }

    expect(retriedDraft).not.toBeNull();
    expect(retriedDraft?.diagnostics.retryCount).toBeLessThanOrEqual(DRAFT_BALANCE.maxRetry);
    if ((retriedDraft?.diagnostics.retryCount ?? 0) < DRAFT_BALANCE.maxRetry) {
      expect(retriedDraft?.diagnostics.highestOfferedQuality)
        .toBeGreaterThanOrEqual(retriedDraft?.diagnostics.abandonedHighestQuality ?? 1);
    }
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

  it('applies a creative orchestration atomically and clears remaining slots', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a creative tower');
    engine.selectTower(tower.id);
    const revision = engine.getViewSnapshot().revision;

    expect(engine.applyCreativeOrchestration({
      slots: ['arcbolt', null, 'pulse'],
      targeting: 'density-highest',
    })).toEqual({ ok: true });
    expect(tower.slots).toEqual(['arcbolt', null, 'pulse', ...Array<null>(tower.slots.length - 3).fill(null)]);
    expect(tower.targeting).toBe('density-highest');
    expect(engine.getViewSnapshot().revision).toBe(revision + 1);
  });

  it('rejects an oversized creative orchestration without partial changes', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a creative tower');
    engine.selectTower(tower.id);
    const slotsBefore = [...tower.slots];
    const targetingBefore = tower.targeting;

    expect(engine.applyCreativeOrchestration({
      slots: [...tower.slots, 'pulse'],
      targeting: 'hp-highest',
    })).toEqual({ ok: false, reason: 'too-many-slots' });
    expect(tower.slots).toEqual(slotsBefore);
    expect(tower.targeting).toBe(targetingBefore);
  });

  it('does not expose orchestration application to standard sessions', () => {
    const engine = new GameEngine({ mode: 'standard', seed: 5 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a standard tower');
    engine.selectTower(tower.id);

    expect(engine.applyCreativeOrchestration({ slots: ['pulse'], targeting: 'hp-lowest' })).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('allows multiple signals to be injected during a creative run', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });

    engine.spawnCreativeSignal('crown');
    engine.spawnCreativeSignal('crown');
    expect(engine.signals.filter((signal) => signal.type === 'crown')).toHaveLength(2);
  });

  it('deletes signals without reporting a combat outcome', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    const events: CombatEvent[] = [];
    const unsubscribe = engine.subscribeCombat((event) => events.push(event));
    engine.spawnCreativeSignal('crown');
    engine.spawnCreativeSignal('crown');
    const signalIds = engine.signals.map((signal) => signal.id);
    events.length = 0;

    expect(engine.deleteSignals(signalIds)).toBe(signalIds.length);
    expect(engine.signals.some((signal) => signalIds.includes(signal.id))).toBe(false);
    expect(events.some((event) => event.type === 'signal-defeated' || event.type === 'signal-leaked')).toBe(false);
    expect(engine.getSnapshot().signalsAlive).toBe(0);
    unsubscribe();
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
