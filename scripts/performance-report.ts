import { distance } from '../src/game/math';
import { EnemySpatialIndex } from '../src/game/spatial-index';
import type { Enemy, Point } from '../src/game/types';

const ENEMY_COUNT = 10_000;
const QUERY_COUNT = 2_000;
const QUERY_RADIUS = 175;

const enemies: Enemy[] = Array.from({ length: ENEMY_COUNT }, (_, id) => ({
  id,
  type: 'spark',
  progress: id / ENEMY_COUNT,
  distance: id,
  position: { x: (id * 73) % 1080, y: (id * 151) % 650 },
  angle: 0,
  hp: 1,
  maxHp: 1,
  speed: 0,
  reward: 0,
  radius: 13,
  slowFactor: 0,
  slowTime: 0,
  hitFlash: 0,
  shield: 0,
  maxShield: 0,
  shieldHitFlash: 0,
  shieldRadiusScale: 0,
  shieldRippleAge: 0,
  statuses: [],
  dead: false,
}));
const queries: Point[] = Array.from({ length: QUERY_COUNT }, (_, id) => ({
  x: (id * 47) % 1080,
  y: (id * 89) % 650,
}));

const measure = (query: (point: Point) => number): { milliseconds: number; matches: number } => {
  const started = performance.now();
  let matches = 0;
  for (const point of queries) matches += query(point);
  return { milliseconds: performance.now() - started, matches };
};

const index = new EnemySpatialIndex();
index.rebuild(enemies);
const indexed = measure((point) => index.countWithinRadius(point, QUERY_RADIUS));
const naive = measure((point) => enemies.reduce(
  (count, enemy) => count + (distance(enemy.position, point) <= QUERY_RADIUS ? 1 : 0),
  0,
));

if (indexed.matches !== naive.matches) {
  throw new Error(`Spatial index mismatch: ${indexed.matches} !== ${naive.matches}`);
}

const improvement = naive.milliseconds / Math.max(indexed.milliseconds, 0.01);
console.log([
  `Spatial query benchmark (${ENEMY_COUNT.toLocaleString()} enemies × ${QUERY_COUNT.toLocaleString()} queries)`,
  `indexed: ${indexed.milliseconds.toFixed(1)} ms`,
  `naive:   ${naive.milliseconds.toFixed(1)} ms`,
  `ratio:   ${improvement.toFixed(2)}× faster`,
].join('\n'));
