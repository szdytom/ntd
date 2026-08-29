import type { EnemyType, Point } from './types';

export const WORLD = { width: 1080, height: 650 } as const;

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
  shape?: 'polygon' | 'fracture' | 'ring';
  shield?: EnemyShieldConfig;
  split?: EnemySplitConfig;
  aura?: EnemyAuraConfig;
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

export interface LevelDefinition {
  id: string;
  name: string;
  sector: string;
  description: string;
  difficulty: 1 | 2 | 3;
  accent: string;
  path: readonly Point[];
  towerPads: readonly Point[];
  waves: readonly (readonly EnemyType[])[];
  startingShards: number;
  enemyHealthScale: number;
  enemySpeedScale: number;
}

const group = (type: EnemyType, count: number): EnemyType[] => Array.from({ length: count }, () => type);
const wave = (...groups: Array<[EnemyType, number]>): EnemyType[] => groups.flatMap(([type, count]) => group(type, count));

export const TUTORIAL_LEVEL_ID = 'starter-elbow';

export const LEVELS = [
  {
    id: 'starter-elbow',
    name: 'Launch Elbow',
    sector: 'SECTOR T-0',
    description: 'A guided two-wave exercise with fixed modules.',
    difficulty: 1,
    accent: '#168aad',
    path: [
      { x: -40, y: 510 }, { x: 420, y: 510 },
      { x: 420, y: 145 }, { x: 1120, y: 145 },
    ],
    towerPads: [
      { x: 465, y: 590 },
      { x: 465, y: 65 },
    ],
    waves: [
      wave(['spark', 5]),
      wave(['spark', 6], ['kite', 3]),
    ],
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
    path: [
      { x: -40, y: 118 }, { x: 165, y: 118 }, { x: 165, y: 282 },
      { x: 405, y: 282 }, { x: 405, y: 128 }, { x: 650, y: 128 },
      { x: 650, y: 392 }, { x: 872, y: 392 }, { x: 872, y: 548 }, { x: 1120, y: 548 },
    ],
    towerPads: [
      { x: 274, y: 192 }, { x: 292, y: 370 }, { x: 510, y: 224 }, { x: 650, y: 480 },
      { x: 752, y: 286 }, { x: 778, y: 493 }, { x: 954, y: 458 },
    ],
    waves: [
      wave(['crown', 1], ['spark', 6]),
      wave(['spark', 12], ['kite', 8], ['block', 2]),
      wave(['kite', 8], ['block', 6], ['hex', 2]),
      wave(['spark', 10], ['block', 8], ['hex', 4]),
      wave(['kite', 4], ['block', 3], ['hex', 5], ['fracture', 1]),
    ],
    startingShards: 240,
    enemyHealthScale: 1,
    enemySpeedScale: 1,
  },
  {
    id: 'rose-circuit',
    name: 'Rose Circuit',
    sector: 'SECTOR C-3',
    description: 'A serpentine route with dense packs and suppression fields.',
    difficulty: 2,
    accent: '#ff5c8a',
    path: [
      { x: -40, y: 522 }, { x: 142, y: 522 }, { x: 142, y: 158 },
      { x: 334, y: 158 }, { x: 334, y: 470 }, { x: 532, y: 470 },
      { x: 532, y: 92 }, { x: 742, y: 92 }, { x: 742, y: 330 },
      { x: 936, y: 330 }, { x: 936, y: 552 }, { x: 1120, y: 552 },
    ],
    towerPads: [
      { x: 72, y: 410 }, { x: 232, y: 248 }, { x: 232, y: 590 }, { x: 430, y: 365 },
      { x: 628, y: 188 }, { x: 640, y: 560 }, { x: 838, y: 214 }, { x: 1020, y: 430 },
    ],
    waves: [
      wave(['spark', 14], ['kite', 7], ['block', 1]),
      wave(['kite', 10], ['block', 5]),
      wave(['spark', 8], ['block', 7], ['hex', 2]),
      wave(['kite', 10], ['block', 7], ['hex', 2]),
      wave(['spark', 12], ['block', 8], ['hex', 5]),
      wave(['kite', 6], ['block', 3], ['hex', 7], ['radiant', 1]),
    ],
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
    path: [
      { x: -40, y: 326 }, { x: 150, y: 326 }, { x: 150, y: 92 },
      { x: 360, y: 92 }, { x: 360, y: 552 }, { x: 582, y: 552 },
      { x: 582, y: 188 }, { x: 792, y: 188 }, { x: 792, y: 474 },
      { x: 1000, y: 474 }, { x: 1000, y: 326 }, { x: 1120, y: 326 },
    ],
    towerPads: [
      { x: 72, y: 214 }, { x: 250, y: 176 }, { x: 254, y: 438 }, { x: 466, y: 306 },
      { x: 680, y: 322 }, { x: 682, y: 610 }, { x: 894, y: 342 }, { x: 1040, y: 220 },
    ],
    waves: [
      wave(['spark', 18], ['kite', 5], ['block', 1]),
      wave(['spark', 12], ['kite', 10], ['block', 2]),
      wave(['kite', 8], ['block', 6], ['hex', 1]),
      wave(['spark', 12], ['block', 8], ['hex', 3]),
      wave(['kite', 10], ['block', 8], ['hex', 4]),
      wave(['spark', 12], ['block', 6], ['hex', 5], ['crown', 1]),
      wave(['block', 8], ['hex', 5], ['fracture', 1], ['radiant', 1]),
    ],
    startingShards: 260,
    enemyHealthScale: 1.16,
    enemySpeedScale: 1.08,
  },
] as const satisfies readonly [LevelDefinition, ...LevelDefinition[]];

export const DEFAULT_LEVEL_ID = 'white-prism';

export function getLevel(levelId: string): LevelDefinition {
  return LEVELS.find((level) => level.id === levelId)
    ?? LEVELS.find((level) => level.id === DEFAULT_LEVEL_ID)
    ?? LEVELS[0];
}

export const TOWER_COLORS = ['#6c5ce7', '#ff5c8a', '#00b894', '#ff9f43', '#168aad'];
