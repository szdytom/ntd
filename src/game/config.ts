import type { EnemyType, Point } from './types';
import { createRouteMap, legacyPathToGraph, type NodeId, type RouteMap } from './path';

export const WORLD = { width: 1160, height: 650 } as const;

export interface EnemyConfig {
  hp: number;
  speed: number;
  spawnDelay: number;
  reward: number;
  coreDamage: number;
  radius: number;
  color: string;
  sides: number;
  name: string;
  shape?: 'polygon' | 'surge' | 'fracture' | 'anvil' | 'ring';
  movement?: EnemyWaveMovementConfig;
  shield?: EnemyShieldConfig;
  armor?: EnemyArmorConfig;
  split?: EnemySplitConfig;
  aura?: EnemyAuraConfig;
  boss?: boolean;
}

export interface EnemyWaveMovementConfig {
  cycle: number;
  peakSpeedMultiplier: number;
  wavePower: number;
}

export interface EnemyArmorConfig {
  damageCap: number;
  continuousDamageCapPerSecond: number;
}

export interface EnemyAuraConfig {
  radius: number;
  cooldownMultiplier: number;
  energyRegenMultiplier: number;
  color: string;
  lightningColor: string;
  lightningCoreColor: string;
}

export interface EnemySplitConfig {
  count: number;
  healthScale: number;
  speedScale: number;
  rewardScale: number;
  coreDamageScale: number;
  radiusScale: number;
  spacing: number;
}

export interface EnemyShieldConfig {
  capacity: number;
  regen: number;
  cooldown: number;
  radius: number;
  sides: number;
  rotation: number;
  color: string;
}

export const ENEMIES: Record<EnemyType, EnemyConfig> = {
  spark: { hp: 28, speed: 105, spawnDelay: 0.42, reward: 3, coreDamage: 1, radius: 13, color: '#ffcf4a', sides: 3, name: 'Spark' },
  surge: {
    hp: 24,
    speed: 95,
    spawnDelay: 0.5,
    reward: 4,
    coreDamage: 1,
    radius: 15,
    color: '#3d8bfd',
    sides: 4,
    name: 'Surge',
    shape: 'surge',
    movement: { cycle: 1.3, peakSpeedMultiplier: 5.25, wavePower: 8 },
  },
  kite: { hp: 62, speed: 74, spawnDelay: 0.58, reward: 5, coreDamage: 1, radius: 15, color: '#ff6b9d', sides: 4, name: 'Kite' },
  block: { hp: 125, speed: 53, spawnDelay: 0.72, reward: 8, coreDamage: 2, radius: 17, color: '#20c997', sides: 4, name: 'Phalanx' },
  hex: { hp: 235, speed: 43, spawnDelay: 0.86, reward: 14, coreDamage: 3, radius: 21, color: '#7257fa', sides: 6, name: 'Hex Armor' },
  crown: {
    hp: 420,
    speed: 31,
    spawnDelay: 1.4,
    reward: 52,
    coreDamage: 8,
    radius: 29,
    color: '#ff774d',
    sides: 8,
    name: 'Prism Crown',
    boss: true,
    shield: { capacity: 240, regen: 4, cooldown: 9, radius: 72, sides: 6, rotation: Math.PI / 6, color: '#45b7ff' },
  },
  fracture: {
    hp: 360,
    speed: 35,
    spawnDelay: 1.35,
    reward: 32,
    coreDamage: 7,
    radius: 32,
    color: '#00a8cc',
    sides: 4,
    name: 'Fracture Star',
    shape: 'fracture',
    split: {
      count: 3,
      healthScale: 0.3,
      speedScale: 1.35,
      rewardScale: 0.25,
      coreDamageScale: 0.34,
      radiusScale: 0.58,
      spacing: 25,
    },
  },
  anvil: {
    hp: 480,
    speed: 26,
    spawnDelay: 1.5,
    reward: 50,
    coreDamage: 8,
    radius: 34,
    color: '#b88a35',
    sides: 5,
    name: 'Prism Anvil',
    shape: 'anvil',
    armor: { damageCap: 6, continuousDamageCapPerSecond: 24 },
  },
  radiant: {
    hp: 390,
    speed: 30,
    spawnDelay: 1.4,
    reward: 46,
    coreDamage: 7,
    radius: 31,
    color: '#9aae18',
    sides: 3,
    name: 'Radiant Lag Ring',
    shape: 'ring',
    aura: {
      radius: 290,
      cooldownMultiplier: 2,
      energyRegenMultiplier: 0.5,
      color: '#b7cc35',
      lightningColor: '#382347',
      lightningCoreColor: '#a78bfa',
    },
  },
};

export interface SpawnEntry {
  type: EnemyType;
  entrance?: NodeId;
}

export interface LevelModuleDraft {
  initialPicks: number;
  wavePicks: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  sector: string;
  description: string;
  difficulty: 1 | 2 | 3;
  accent: string;
  graph: RouteMap;
  towerPads: readonly Point[];
  waves: readonly (readonly SpawnEntry[])[];
  moduleDraft: LevelModuleDraft;
  startingShards: number;
  enemyHealthScale: number;
  enemySpeedScale: number;
}

const group = (type: EnemyType, count: number, entrance?: NodeId): SpawnEntry[] => (
  Array.from({ length: count }, () => ({ type, ...(entrance ? { entrance } : {}) }))
);
const wave = (...groups: Array<[EnemyType, number, NodeId?]>): SpawnEntry[] => (
  groups.flatMap(([type, count, entrance]) => group(type, count, entrance))
);
const DEFAULT_MODULE_DRAFT: LevelModuleDraft = { initialPicks: 3, wavePicks: 3 };

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
  if (ENEMIES[entry.type].boss) {
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
    description: 'A guided two-wave exercise with fixed modules.',
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
    moduleDraft: DEFAULT_MODULE_DRAFT,
    startingShards: 180,
    enemyHealthScale: 0.72,
    enemySpeedScale: 0.85,
  },
  {
    id: 'white-prism',
    name: 'White Prism',
    sector: 'SECTOR A-7',
    description: 'A balanced angular route with shields and splitting enemies.',
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
      wave(['spark', 10], ['block', 8], ['hex', 4]),
      wave(['kite', 4], ['block', 3], ['hex', 5], ['fracture', 1, 'white-prism:0']),
    ],
    moduleDraft: DEFAULT_MODULE_DRAFT,
    startingShards: 240,
    enemyHealthScale: 1,
    enemySpeedScale: 1,
  },
  {
    id: 'rose-circuit',
    name: 'Rose Circuit',
    sector: 'SECTOR C-3',
    description: 'A serpentine route with layered armor and suppression fields.',
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
      wave(['kite', 6], ['block', 3], ['hex', 7], ['radiant', 1, 'rose-circuit:0']),
    ],
    moduleDraft: DEFAULT_MODULE_DRAFT,
    startingShards: 250,
    enemyHealthScale: 1.08,
    enemySpeedScale: 1.03,
  },
  {
    id: 'verdant-fold',
    name: 'Verdant Fold',
    sector: 'SECTOR E-9',
    description: 'A fast folded route combining splitting and local suppression.',
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
    moduleDraft: DEFAULT_MODULE_DRAFT,
    startingShards: 260,
    enemyHealthScale: 1.16,
    enemySpeedScale: 1.08,
  },
  {
    id: 'triune-delta',
    name: 'Triune Delta',
    sector: 'SECTOR D-6',
    description: 'Three incoming channels merge under increasingly mixed elite assaults.',
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
    moduleDraft: { initialPicks: 5, wavePicks: 4 },
    startingShards: 340,
    enemyHealthScale: 1.2,
    enemySpeedScale: 1.1,
  },
] as const satisfies readonly [LevelDefinition, ...LevelDefinition[]];

for (const level of LEVELS) {
  for (const [key, picks] of Object.entries(level.moduleDraft)) {
    if (!Number.isInteger(picks) || picks <= 0) throw new Error(`${level.id} ${key} must be a positive integer`);
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
