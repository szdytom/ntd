import { distance } from '@prism-bastion/game-core/game/math';
import { WORLD } from '@prism-bastion/game-core/game/config';
import { SignalSpatialIndex } from '@prism-bastion/game-core/game/spatial-index';
import type { Signal, Point } from '@prism-bastion/game-core/game/types';

const SIGNAL_COUNT = 10_000;
const QUERY_COUNT = 2_000;
const QUERY_RADIUS = 175;

const signals: Signal[] = Array.from({ length: SIGNAL_COUNT }, (_, id) => ({
  id,
  type: 'spark',
  variantId: 'spark',
  routeId: 'benchmark',
  progress: id / SIGNAL_COUNT,
  distance: id,
  position: { x: (id * 73) % WORLD.width, y: (id * 151) % WORLD.height },
  angle: 0,
  hp: 1,
  maxHp: 1,
  speed: 0,
  reward: 0,
  coreDamage: 1,
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
  x: (id * 47) % WORLD.width,
  y: (id * 89) % WORLD.height,
}));

const measure = (query: (point: Point) => number): { milliseconds: number; matches: number } => {
  const started = performance.now();
  let matches = 0;
  for (const point of queries) matches += query(point);
  return { milliseconds: performance.now() - started, matches };
};

const index = new SignalSpatialIndex();
index.rebuild(signals);
const indexed = measure((point) => index.countWithinRadius(point, QUERY_RADIUS));
const naive = measure((point) => signals.reduce(
  (count, signal) => count + (distance(signal.position, point) <= QUERY_RADIUS ? 1 : 0),
  0,
));

if (indexed.matches !== naive.matches) {
  throw new Error(`Spatial index mismatch: ${indexed.matches} !== ${naive.matches}`);
}

const improvement = naive.milliseconds / Math.max(indexed.milliseconds, 0.01);
console.log([
  `Spatial query benchmark (${SIGNAL_COUNT.toLocaleString()} signals × ${QUERY_COUNT.toLocaleString()} queries)`,
  `indexed: ${indexed.milliseconds.toFixed(1)} ms`,
  `naive:   ${naive.milliseconds.toFixed(1)} ms`,
  `ratio:   ${improvement.toFixed(2)}× faster`,
].join('\n'));
