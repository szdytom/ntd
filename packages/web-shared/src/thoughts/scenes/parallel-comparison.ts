import { createRouteMap } from '@prism-bastion/game-core/game/path';
import type { ThoughtSceneFactory } from '../authoring';

export const PARALLEL_COMPARISON_ENTRANCES = {
  upper: 'comparison:upper:entrance',
  lower: 'comparison:lower:entrance',
} as const;
export const PARALLEL_COMPARISON_MERGE_NODE = 'comparison:merge';

export interface ParallelComparisonOptions {
  readonly towerSlots?: number;
  readonly signalHealthScale?: number;
  readonly signalSpeedScale?: number;
}

const upperEntrance = { x: 240, y: 185 } as const;
const upperEnd = { x: 560, y: 185 } as const;
const lowerEntrance = { x: 240, y: 455 } as const;
const lowerEnd = { x: 560, y: 455 } as const;
const merge = { x: 690, y: 320 } as const;
const root = { x: 1360, y: 320 } as const;

/**
 * A mirrored two-lane stage for simultaneous carrier and loadout comparisons.
 * Both branches converge into one shared exit beyond the authored focal area.
 */
export const parallelComparisonScene = (
  options: ParallelComparisonOptions = {},
): ThoughtSceneFactory => ({ thoughtId, accent }) => {
  const towers = [{ x: 150, y: 185 }, { x: 150, y: 455 }] as const;
  return {
    id: `${thoughtId}:parallel-comparison`,
    path: [upperEntrance, upperEnd, root],
    tower: towers[0],
    graph: createRouteMap([
      { id: PARALLEL_COMPARISON_ENTRANCES.upper, position: upperEntrance, parent: 'comparison:upper:end' },
      { id: 'comparison:upper:end', position: upperEnd, parent: PARALLEL_COMPARISON_MERGE_NODE },
      { id: PARALLEL_COMPARISON_ENTRANCES.lower, position: lowerEntrance, parent: 'comparison:lower:end' },
      { id: 'comparison:lower:end', position: lowerEnd, parent: PARALLEL_COMPARISON_MERGE_NODE },
      { id: PARALLEL_COMPARISON_MERGE_NODE, position: merge, parent: 'comparison:root' },
      { id: 'comparison:root', position: root, parent: null },
    ], [PARALLEL_COMPARISON_ENTRANCES.upper, PARALLEL_COMPARISON_ENTRANCES.lower]),
    towerPads: towers,
    camera: { center: { x: 580, y: 320 }, height: 650 },
    accent,
    signalHealthScale: options.signalHealthScale ?? 0.9,
    signalSpeedScale: options.signalSpeedScale ?? 0.7,
    ...(options.towerSlots === undefined ? {} : { towerSlots: options.towerSlots }),
  };
};
