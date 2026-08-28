import { distance } from './math';
import type { Enemy, TargetingMode, Tower } from './types';

export type DensityQuery = (enemy: Enemy) => number;

export function selectTowerTarget(
  tower: Tower,
  candidates: readonly Enemy[],
  densityQuery: DensityQuery = (enemy) => candidates.reduce(
    (count, other) => count + (!other.dead && distance(enemy.position, other.position) <= 92 ? 1 : 0),
    0,
  ),
): Enemy | null {
  let best: Enemy | null = null;
  let bestDensity = 0;
  const densityMode = tower.targeting.startsWith('density');
  for (const candidate of candidates) {
    if (candidate.dead) continue;
    if (!best) {
      best = candidate;
      if (densityMode) bestDensity = densityQuery(candidate);
      continue;
    }
    const candidateDensity = densityMode ? densityQuery(candidate) : 0;
    if (compareTarget(tower.targeting, tower, candidate, best, candidateDensity, bestDensity) < 0) {
      best = candidate;
      bestDensity = candidateDensity;
    }
  }
  return best;
}

function compareTarget(
  mode: TargetingMode,
  tower: Tower,
  candidate: Enemy,
  incumbent: Enemy,
  candidateDensity: number,
  incumbentDensity: number,
): number {
  switch (mode) {
    case 'core-nearest': return incumbent.progress - candidate.progress;
    case 'core-farthest': return candidate.progress - incumbent.progress;
    case 'hp-lowest': return candidate.hp - incumbent.hp || incumbent.progress - candidate.progress;
    case 'hp-highest': return incumbent.hp - candidate.hp || incumbent.progress - candidate.progress;
    case 'tower-nearest': return distance(candidate.position, tower.position) - distance(incumbent.position, tower.position);
    case 'tower-farthest': return distance(incumbent.position, tower.position) - distance(candidate.position, tower.position);
    case 'density-highest': return incumbentDensity - candidateDensity || incumbent.progress - candidate.progress;
    case 'density-lowest': return candidateDensity - incumbentDensity || incumbent.progress - candidate.progress;
  }
}
