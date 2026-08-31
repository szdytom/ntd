import { describe, expect, it } from 'vitest';
import { getLevel, LEVELS, resolveSpawnEntrances } from '../src/game/config';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import { createRouteMap, legacyPathToGraph, resolveRoute } from '../src/game/path';
import { selectTowerTarget } from '../src/game/targeting';
import { SIGNAL_IDS, signalRegistry } from '../src/signals';

describe('route map model', () => {
  it('resolves each leaf through its unique parent chain to the root', () => {
    const graph = createRouteMap([
      { id: 'north', position: { x: 0, y: -4 }, parent: 'join' },
      { id: 'south', position: { x: 0, y: 3 }, parent: 'join' },
      { id: 'join', position: { x: 5, y: 0 }, parent: 'core' },
      { id: 'core', position: { x: 10, y: 0 }, parent: null },
    ]);
    const north = resolveRoute(graph, 'north');
    const south = resolveRoute(graph, 'south');

    expect(graph.entrances).toEqual(['north', 'south']);
    expect(graph.nodes.get('join')?.children).toEqual(['north', 'south']);
    expect(north.length).toBeCloseTo(Math.hypot(5, 4) + 5, 8);
    expect(south.length).toBeCloseTo(Math.hypot(5, 3) + 5, 8);
    expect(graph.lengthToNode('north')).toBeCloseTo(north.length, 8);
    expect(north.pointAtDistance(north.length).position).toEqual({ x: 10, y: 0 });
    expect(south.pointAtDistance(south.length).position).toEqual({ x: 10, y: 0 });
  });

  it('rejects malformed trees and migrates a legacy polyline without changing it', () => {
    expect(() => createRouteMap([
      { id: 'a', position: { x: 0, y: 0 }, parent: 'b' },
      { id: 'b', position: { x: 1, y: 0 }, parent: 'a' },
      { id: 'core', position: { x: 2, y: 0 }, parent: null },
    ])).toThrow('cycle');
    expect(() => createRouteMap([
      { id: 'entry', position: { x: 0, y: 0 }, parent: 'missing' },
      { id: 'core', position: { x: 1, y: 0 }, parent: null },
    ])).toThrow('Unknown parent');

    const legacy = legacyPathToGraph([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }], 'old');
    const route = resolveRoute(legacy, 'old:0');
    expect(route.length).toBe(7);
    expect(route.pointAtDistance(5).position).toEqual({ x: 3, y: 2 });
  });
});

describe('multi-entrance spawning and targeting', () => {
  const level = getLevel('triune-delta');

  it('broadcasts ordinary entries and keeps configured bosses on fixed entrances', () => {
    const ordinaryType = SIGNAL_IDS.find((type) => !signalRegistry.require(type).stats.boss);
    const bossType = SIGNAL_IDS.find((type) => signalRegistry.require(type).stats.boss);
    const entrance = level.graph.entrances[0];
    if (!ordinaryType || !bossType || !entrance) throw new Error('Expected ordinary and boss test fixtures');

    expect(resolveSpawnEntrances({ type: ordinaryType }, level.graph)).toEqual(level.graph.entrances);
    expect(resolveSpawnEntrances({ type: bossType, entrance }, level.graph)).toEqual([entrance]);
    expect(() => resolveSpawnEntrances({ type: bossType }, level.graph)).toThrow('must declare a fixed entrance');
    expect(() => resolveSpawnEntrances({ type: ordinaryType, entrance: 'missing' }, level.graph)).toThrow('Unknown entrance');
    for (const configuredLevel of LEVELS) {
      for (const entry of configuredLevel.waves.flat()) {
        if (signalRegistry.require(entry.type).stats.boss) expect(entry.entrance, `${configuredLevel.id}: ${entry.type}`).toBeTruthy();
      }
    }
  });

  it('spawns a deterministic wave across all entrances', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'triune-delta', seed: 211 });
    const broadcastWaveIndex = level.waves.findIndex((wave) => {
      const first = wave[0];
      return first && !first.entrance && !signalRegistry.require(first.type).stats.boss;
    });
    if (broadcastWaveIndex < 0) throw new Error('Expected a wave beginning with a broadcast entry');
    engine.wave = broadcastWaveIndex;
    for (const tower of engine.towers) {
      tower.slots.fill(null);
      tower.energy = 0;
      tower.energyRegen = 0;
    }
    engine.startWave();
    for (let step = 0; step < 120 && engine.signals.length === 0; step += 1) engine.update(1 / 60);

    expect(engine.signals.map((signal) => signal.routeId)).toEqual(level.graph.entrances);
  });

  it('moves and prioritizes signals by their own route distance to the core', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'triune-delta', seed: 223 });
    const northEntrance = level.graph.entrances[0];
    const southEntrance = level.graph.entrances.at(-1);
    if (!northEntrance || !southEntrance) throw new Error('Expected at least two entrances');
    engine.spawnCreativeSignal('spark', northEntrance);
    engine.spawnCreativeSignal('spark', southEntrance);
    const north = engine.signals[0];
    const south = engine.signals[1];
    const tower = engine.towers[0];
    if (!north || !south || !tower) throw new Error('Expected signals and a tower');

    engine.update(FIXED_SIMULATION_STEP);
    const northRoute = engine.routeForSignal(north);
    const southRoute = engine.routeForSignal(south);
    expect(north.position).toEqual(northRoute.pointAtDistance(north.distance).position);
    expect(south.position).toEqual(southRoute.pointAtDistance(south.distance).position);
    north.distance = northRoute.length - 40;
    south.distance = southRoute.length - 90;
    north.progress = north.distance / northRoute.length;
    south.progress = south.distance / southRoute.length;
    north.angle = northRoute.sampleInto(north.distance, north.position);
    south.angle = southRoute.sampleInto(south.distance, south.position);

    tower.targeting = 'core-nearest';
    expect(selectTowerTarget(tower, [south, north], undefined, (signal) => engine.distanceToCore(signal))?.id).toBe(north.id);
    tower.targeting = 'core-farthest';
    expect(selectTowerTarget(tower, [north, south], undefined, (signal) => engine.distanceToCore(signal))?.id).toBe(south.id);
  });
});
