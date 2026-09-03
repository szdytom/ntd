import { signalRegistry } from '../signals';
import type { SignalId } from '../signals';
import type { Point } from './types';
import { createRouteMap, legacyPathToGraph, type NodeId, type RouteMap } from './path';

export const WORLD = { width: 1160, height: 650 } as const;

export interface SpawnEntry {
  type: SignalId;
  entrance?: NodeId;
}

export interface LevelModuleDraft {
  initialPicks: number;
  wavePicks: number;
  qualityAnchors: readonly number[];
  qualityBias: number;
  inventoryInfluence: number;
  abandonLimit: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  sector: string;
  difficulty: 1 | 2 | 3;
  accent: string;
  graph: RouteMap;
  towerPads: readonly Point[];
  waves: readonly (readonly SpawnEntry[])[];
  moduleDraft: LevelModuleDraft;
  startingShards: number;
  signalHealthScale: number;
  signalSpeedScale: number;
}

const group = (type: SignalId, count: number, entrance?: NodeId): SpawnEntry[] => (
  Array.from({ length: count }, () => ({ type, ...(entrance ? { entrance } : {}) }))
);
const wave = (...groups: Array<[SignalId, number, NodeId?]>): SpawnEntry[] => (
  groups.flatMap(([type, count, entrance]) => group(type, count, entrance))
);

export const qualityAnchors = (...values: number[]): readonly number[] => {
  if (values.some((anchor) => !Number.isFinite(anchor) || anchor < 1 || anchor > 5)) {
    throw new RangeError('Module quality anchors must be between 1 and 5');
  }
  return values;
};

export const qualityRamp = (count: number, start = 2, end = 3): readonly number[] => {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError('Module quality ramp count must be a positive integer');
  }
  if (count === 1) return qualityAnchors(start);
  return qualityAnchors(...Array.from({ length: count }, (_, index) => (
    start + (end - start) * index / (count - 1)
  )));
};

const moduleDraft = (
  anchors: readonly number[],
  abandonLimit: number,
  picks: Pick<LevelModuleDraft, 'initialPicks' | 'wavePicks'> = { initialPicks: 3, wavePicks: 3 },
): LevelModuleDraft => ({
  ...picks,
  qualityAnchors: anchors,
  qualityBias: 0,
  inventoryInfluence: 0.4,
  abandonLimit,
});

export function resolveSpawnEntrances(
  entry: SpawnEntry,
  graph: RouteMap,
): readonly NodeId[] {
  if (entry.entrance) {
    if (!graph.entrances.includes(entry.entrance)) {
      throw new Error(`Unknown entrance ${entry.entrance} for ${entry.type}`);
    }
    return [entry.entrance];
  }
  if (signalRegistry.require(entry.type).stats.boss) {
    throw new Error(`Boss ${entry.type} must declare a fixed entrance`);
  }
  if (graph.entrances.length === 0) throw new Error('A level requires at least one entrance');
  return graph.entrances;
}

export const TUTORIAL_LEVEL_ID = 'starter-elbow';

export const LEVELS = [
  {
    id: 'starter-elbow',
    name: 'Launch Elbow',
    sector: 'SECTOR T-0',
    difficulty: 1,
    accent: '#168aad',
    graph: legacyPathToGraph([
      { x: -40, y: 510 }, { x: 420, y: 510 },
      { x: 420, y: 145 }, { x: 1120, y: 145 },
    ], 'starter-elbow'),
    towerPads: [
      { x: 465, y: 590 },
      { x: 465, y: 65 },
    ],
    waves: [
      wave(['spark', 5]),
      wave(['spark', 6], ['kite', 3]),
    ],
    moduleDraft: moduleDraft(qualityAnchors(1, 4), 1),
    startingShards: 180,
    signalHealthScale: 0.72,
    signalSpeedScale: 0.85,
  },
  {
    id: 'white-prism',
    name: 'White Prism',
    sector: 'SECTOR A-7',
    difficulty: 1,
    accent: '#6c5ce7',
    graph: legacyPathToGraph([
      { x: -40, y: 118 }, { x: 165, y: 118 }, { x: 165, y: 282 },
      { x: 405, y: 282 }, { x: 405, y: 128 }, { x: 650, y: 128 },
      { x: 650, y: 392 }, { x: 872, y: 392 }, { x: 872, y: 548 }, { x: 1120, y: 548 },
    ], 'white-prism'),
    towerPads: [
      { x: 274, y: 192 }, { x: 292, y: 370 }, { x: 510, y: 224 }, { x: 650, y: 480 },
      { x: 752, y: 286 }, { x: 778, y: 493 }, { x: 954, y: 458 },
    ],
    waves: [
      wave(['crown', 1, 'white-prism:0'], ['spark', 6]),
      wave(['spark', 8], ['surge', 4], ['kite', 8], ['block', 2]),
      wave(['kite', 8], ['block', 6], ['hex', 2]),
      wave(['spark', 10], ['block', 8], ['hex', 3], ['mender', 1]),
      wave(['kite', 4], ['block', 3], ['hex', 4], ['mender', 1], ['fracture', 1, 'white-prism:0']),
    ],
    moduleDraft: moduleDraft(qualityRamp(5), 2),
    startingShards: 240,
    signalHealthScale: 1,
    signalSpeedScale: 1,
  },
  {
    id: 'rose-circuit',
    name: 'Rose Circuit',
    sector: 'SECTOR C-3',
    difficulty: 2,
    accent: '#ff5c8a',
    graph: legacyPathToGraph([
      { x: -40, y: 522 }, { x: 142, y: 522 }, { x: 142, y: 158 },
      { x: 334, y: 158 }, { x: 334, y: 470 }, { x: 532, y: 470 },
      { x: 532, y: 92 }, { x: 742, y: 92 }, { x: 742, y: 330 },
      { x: 936, y: 330 }, { x: 936, y: 552 }, { x: 1120, y: 552 },
    ], 'rose-circuit'),
    towerPads: [
      { x: 72, y: 410 }, { x: 232, y: 248 }, { x: 232, y: 590 }, { x: 430, y: 365 },
      { x: 628, y: 188 }, { x: 640, y: 560 }, { x: 838, y: 214 }, { x: 1020, y: 430 },
    ],
    waves: [
      wave(['spark', 14], ['kite', 7], ['block', 1]),
      wave(['kite', 10], ['block', 5]),
      wave(['spark', 4], ['surge', 4], ['block', 7], ['hex', 2]),
      wave(['kite', 10], ['block', 7], ['hex', 2]),
      wave(['spark', 12], ['block', 8], ['hex', 5], ['anvil', 1]),
      wave(['kite', 6], ['block', 3], ['hex', 7], ['solar', 1], ['radiant', 1, 'rose-circuit:0']),
    ],
    moduleDraft: moduleDraft(qualityRamp(6), 3),
    startingShards: 250,
    signalHealthScale: 1.08,
    signalSpeedScale: 1.03,
  },
  {
    id: 'verdant-fold',
    name: 'Verdant Fold',
    sector: 'SECTOR E-9',
    difficulty: 3,
    accent: '#00b894',
    graph: legacyPathToGraph([
      { x: -40, y: 326 }, { x: 150, y: 326 }, { x: 150, y: 92 },
      { x: 360, y: 92 }, { x: 360, y: 552 }, { x: 582, y: 552 },
      { x: 582, y: 188 }, { x: 792, y: 188 }, { x: 792, y: 474 },
      { x: 1000, y: 474 }, { x: 1000, y: 326 }, { x: 1120, y: 326 },
    ], 'verdant-fold'),
    towerPads: [
      { x: 72, y: 214 }, { x: 250, y: 176 }, { x: 254, y: 438 }, { x: 466, y: 306 },
      { x: 680, y: 322 }, { x: 682, y: 610 }, { x: 894, y: 342 }, { x: 1040, y: 220 },
    ],
    waves: [
      wave(['spark', 12], ['surge', 6], ['kite', 5], ['block', 1]),
      wave(['spark', 12], ['kite', 10], ['block', 2]),
      wave(['kite', 8], ['block', 6], ['hex', 1]),
      wave(['spark', 12], ['block', 8], ['hex', 3]),
      wave(['kite', 10], ['block', 8], ['hex', 4]),
      wave(['spark', 12], ['block', 6], ['hex', 5], ['crown', 1, 'verdant-fold:0']),
      wave(['block', 8], ['hex', 5], ['fracture', 1, 'verdant-fold:0'], ['radiant', 1, 'verdant-fold:0']),
    ],
    moduleDraft: moduleDraft(qualityRamp(7), 3),
    startingShards: 260,
    signalHealthScale: 1.16,
    signalSpeedScale: 1.08,
  },
  {
    id: 'triune-delta',
    name: 'Triune Delta',
    sector: 'SECTOR D-6',
    difficulty: 3,
    accent: '#2f80ed',
    graph: createRouteMap([
      { id: 'north-entry', position: { x: -40, y: 85 }, parent: 'north-bend' },
      { id: 'north-bend', position: { x: 175, y: 85 }, parent: 'confluence' },
      { id: 'center-entry', position: { x: -40, y: 325 }, parent: 'center-bend' },
      { id: 'center-bend', position: { x: 175, y: 325 }, parent: 'confluence' },
      { id: 'south-entry', position: { x: -40, y: 565 }, parent: 'south-bend' },
      { id: 'south-bend', position: { x: 175, y: 565 }, parent: 'confluence' },
      { id: 'confluence', position: { x: 415, y: 325 }, parent: 'lower-fold' },
      { id: 'lower-fold', position: { x: 600, y: 510 }, parent: 'upper-fold' },
      { id: 'upper-fold', position: { x: 820, y: 290 }, parent: 'core' },
      { id: 'core', position: { x: 1120, y: 290 }, parent: null },
    ], ['north-entry', 'center-entry', 'south-entry']),
    towerPads: [
      { x: 90, y: 180 }, { x: 480, y: 270 }, { x: 185, y: 415 }, { x: 90, y: 470 },
      { x: 355, y: 505 }, { x: 555, y: 575 }, { x: 665, y: 590 }, { x: 735, y: 270 },
      { x: 910, y: 370 }, { x: 960, y: 215 },
    ],
    waves: [
      wave(['spark', 6], ['surge', 6], ['kite', 1]),
      wave(['spark', 8], ['kite', 4], ['block', 1]),
      wave(['surge', 6], ['kite', 8], ['block', 3]),
      wave(['spark', 9], ['block', 7], ['hex', 2], ['crown', 1, 'north-entry']),
      wave(['kite', 8], ['block', 6], ['fracture', 1, 'center-entry']),
      wave(
        ['surge', 6], ['hex', 6],
        ['fracture', 1, 'north-entry'], ['crown', 1, 'center-entry'],
        ['fracture', 1, 'south-entry'],
      ),
      wave(
        ['block', 8], ['hex', 5],
        ['anvil', 1, 'north-entry'], ['radiant', 1, 'center-entry'],
        ['anvil', 1, 'south-entry'],
      ),
      wave(
        ['kite', 6], ['block', 6], ['hex', 6],
        ['crown', 1, 'north-entry'], ['fracture', 1, 'north-entry'],
        ['radiant', 1, 'center-entry'], ['anvil', 1, 'center-entry'],
        ['crown', 1, 'south-entry'], ['fracture', 1, 'south-entry'],
      ),
    ],
    moduleDraft: moduleDraft(
      qualityRamp(8),
      4,
      { initialPicks: 5, wavePicks: 4 },
    ),
    startingShards: 340,
    signalHealthScale: 1.2,
    signalSpeedScale: 1.1,
  },
] as const satisfies readonly [LevelDefinition, ...LevelDefinition[]];

for (const level of LEVELS) {
  for (const [key, picks] of Object.entries({
    initialPicks: level.moduleDraft.initialPicks,
    wavePicks: level.moduleDraft.wavePicks,
  })) {
    if (!Number.isInteger(picks) || picks <= 0) throw new Error(`${level.id} ${key} must be a positive integer`);
  }
  if (level.moduleDraft.qualityAnchors.length !== level.waves.length) {
    throw new Error(`${level.id} requires one module quality anchor per reward batch`);
  }
  if (level.moduleDraft.qualityAnchors.some((anchor) => !Number.isFinite(anchor) || anchor < 1 || anchor > 5)) {
    throw new Error(`${level.id} module quality anchors must be between 1 and 5`);
  }
  if (!Number.isFinite(level.moduleDraft.qualityBias)) {
    throw new Error(`${level.id} module quality bias must be finite`);
  }
  if (!Number.isFinite(level.moduleDraft.inventoryInfluence)
    || level.moduleDraft.inventoryInfluence < 0
    || level.moduleDraft.inventoryInfluence > 1) {
    throw new Error(`${level.id} module inventory influence must be between 0 and 1`);
  }
  if (!Number.isInteger(level.moduleDraft.abandonLimit) || level.moduleDraft.abandonLimit < 0) {
    throw new Error(`${level.id} module abandon limit must be a non-negative integer`);
  }
  for (const entries of level.waves) {
    entries.forEach((entry) => resolveSpawnEntrances(entry, level.graph));
  }
}

export const DEFAULT_LEVEL_ID = 'white-prism';

export function getLevel(levelId: string): LevelDefinition {
  return LEVELS.find((level) => level.id === levelId)
    ?? LEVELS.find((level) => level.id === DEFAULT_LEVEL_ID)
    ?? LEVELS[0];
}

export const TOWER_COLORS = ['#6c5ce7', '#ff5c8a', '#00b894', '#ff9f43', '#168aad'];
