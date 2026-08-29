import { describe, expect, it } from 'vitest';
import { ENEMIES, getLevel, LEVELS, resolveSpawnEntrances } from '../src/game/config';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import { createRouteMap, legacyPathToGraph, resolveRoute } from '../src/game/path';
import { selectTowerTarget } from '../src/game/targeting';

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
    const ordinary = { type: 'spark' } as const;
    expect(resolveSpawnEntrances(ordinary, level.graph)).toEqual([
      'north-entry', 'center-entry', 'south-entry',
    ]);
    expect(resolveSpawnEntrances({ type: 'crown', entrance: 'north-entry' }, level.graph)).toEqual(['north-entry']);
    expect(() => resolveSpawnEntrances({ type: 'crown' }, level.graph)).toThrow('must declare a fixed entrance');
    expect(() => resolveSpawnEntrances({ type: 'spark', entrance: 'missing' }, level.graph)).toThrow('Unknown entrance');
    expect(ENEMIES.anvil.boss).not.toBe(true);
    expect(ENEMIES.fracture.boss).not.toBe(true);
    expect(ENEMIES.radiant.boss).not.toBe(true);
    for (const configuredLevel of LEVELS) {
      for (const entry of configuredLevel.waves.flat()) {
        if (ENEMIES[entry.type].boss) expect(entry.entrance, `${configuredLevel.id}: ${entry.type}`).toBeTruthy();
      }
    }
  });

  it('spawns a deterministic wave across all entrances', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'triune-delta', seed: 211 });
    for (const tower of engine.towers) {
      tower.slots.fill(null);
      tower.energy = 0;
      tower.energyRegen = 0;
    }
    engine.startWave();
    for (let step = 0; step < 120 && engine.enemies.length === 0; step += 1) engine.update(1 / 60);

    expect(engine.enemies.map((enemy) => enemy.routeId)).toEqual([
      'north-entry', 'center-entry', 'south-entry',
    ]);

    for (let step = 0; step < 120 && engine.enemies.length < 6; step += 1) engine.update(1 / 60);

    expect(engine.enemies.map((enemy) => enemy.routeId)).toEqual([
      'north-entry', 'center-entry', 'south-entry', 'north-entry', 'center-entry', 'south-entry',
    ]);
  });

  it('advances entrance queues independently and deploys parallel elites in the same tick', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'triune-delta', seed: 217 });
    for (const tower of engine.towers) {
      tower.slots.fill(null);
      tower.energy = 0;
      tower.energyRegen = 0;
    }
    engine.wave = 4;
    engine.startWave();

    expect(engine.getSnapshot().waveQueue).toBe(39);
    for (let step = 0; step < 2_000; step += 1) {
      engine.update(FIXED_SIMULATION_STEP);
      const elites = engine.enemies.filter((enemy) => enemy.type === 'fracture' || enemy.type === 'crown');
      if (elites.length === 0) continue;
      expect(elites.map((enemy) => `${enemy.routeId}:${enemy.type}`)).toEqual([
        'north-entry:fracture',
        'center-entry:crown',
        'south-entry:fracture',
      ]);
      return;
    }
    throw new Error('Expected fifth-wave elites to spawn');
  });

  it('moves and prioritizes enemies by their own route distance to the core', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'triune-delta', seed: 223 });
    engine.spawnCreativeEnemy('spark', 'north-entry');
    engine.spawnCreativeEnemy('spark', 'south-entry');
    const north = engine.enemies[0];
    const south = engine.enemies[1];
    const tower = engine.towers[0];
    if (!north || !south || !tower) throw new Error('Expected enemies and a tower');

    engine.update(FIXED_SIMULATION_STEP);
    expect(north.position.y).toBe(85);
    expect(south.position.y).toBe(565);

    const northRoute = engine.routeForEnemy(north);
    const southRoute = engine.routeForEnemy(south);
    north.distance = northRoute.length - 40;
    south.distance = southRoute.length - 90;
    north.progress = north.distance / northRoute.length;
    south.progress = south.distance / southRoute.length;
    north.angle = northRoute.sampleInto(north.distance, north.position);
    south.angle = southRoute.sampleInto(south.distance, south.position);

    tower.targeting = 'core-nearest';
    expect(selectTowerTarget(tower, [south, north], undefined, (enemy) => engine.distanceToCore(enemy))?.id).toBe(north.id);
    tower.targeting = 'core-farthest';
    expect(selectTowerTarget(tower, [north, south], undefined, (enemy) => engine.distanceToCore(enemy))?.id).toBe(south.id);
  });
});
