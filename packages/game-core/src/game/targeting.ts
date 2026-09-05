import { distance } from './math';
import type { Signal, TargetingMode, Tower } from './types';

export type DensityQuery = (signal: Signal) => number;
export type CoreDistanceQuery = (signal: Signal) => number;

export function selectTowerTarget(
  tower: Tower,
  candidates: readonly Signal[],
  densityQuery: DensityQuery = (signal) => candidates.reduce(
    (count, other) => count + (!other.dead && distance(signal.position, other.position) <= 92 ? 1 : 0),
    0,
  ),
  coreDistanceQuery: CoreDistanceQuery = (signal) => 1 - signal.progress,
): Signal | null {
  let best: Signal | null = null;
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
    if (compareTarget(
      tower.targeting,
      tower,
      candidate,
      best,
      candidateDensity,
      bestDensity,
      coreDistanceQuery(candidate),
      coreDistanceQuery(best),
    ) < 0) {
      best = candidate;
      bestDensity = candidateDensity;
    }
  }
  return best;
}

function compareTarget(
  mode: TargetingMode,
  tower: Tower,
  candidate: Signal,
  incumbent: Signal,
  candidateDensity: number,
  incumbentDensity: number,
  candidateCoreDistance: number,
  incumbentCoreDistance: number,
): number {
  switch (mode) {
    case 'core-nearest': return candidateCoreDistance - incumbentCoreDistance;
    case 'core-farthest': return incumbentCoreDistance - candidateCoreDistance;
    case 'hp-lowest': return candidate.hp - incumbent.hp || candidateCoreDistance - incumbentCoreDistance;
    case 'hp-highest': return incumbent.hp - candidate.hp || candidateCoreDistance - incumbentCoreDistance;
    case 'tower-nearest': return distance(candidate.position, tower.position) - distance(incumbent.position, tower.position);
    case 'tower-farthest': return distance(incumbent.position, tower.position) - distance(candidate.position, tower.position);
    case 'density-highest': return incumbentDensity - candidateDensity || candidateCoreDistance - incumbentCoreDistance;
    case 'density-lowest': return candidateDensity - incumbentDensity || candidateCoreDistance - incumbentCoreDistance;
  }
}
