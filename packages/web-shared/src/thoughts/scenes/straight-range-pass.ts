import { createRouteMap } from '@prism-bastion/game-core/game/path';
import type { ThoughtSceneFactory } from '../authoring';

export const STRAIGHT_RANGE_ENTRANCE = 'range:entrance';
export const STRAIGHT_RANGE_CLEANUP = 'range:cleanup';

export interface StraightRangePassOptions {
  readonly towerSlots?: number;
  readonly signalHealthScale?: number;
  readonly signalSpeedScale?: number;
}

/**
 * A neutral single-road stage suited to projectile, modifier, area, trigger,
 * and static-payload demonstrations. Storyboards own its choreography. The
 * cleanup node sits just past the tower's range so an ending can wait for
 * every signal to leave the authored area before removing it.
 */
export const straightRangePassScene = (
  options: StraightRangePassOptions = {},
): ThoughtSceneFactory => ({ thoughtId, accent }) => ({
  id: `${thoughtId}:straight-range-pass`,
  path: [{ x: -60, y: 340 }, { x: 860, y: 340 }, { x: 1220, y: 340 }],
  tower: { x: 580, y: 455 },
  graph: createRouteMap([
    { id: STRAIGHT_RANGE_ENTRANCE, position: { x: -60, y: 340 }, parent: STRAIGHT_RANGE_CLEANUP },
    { id: STRAIGHT_RANGE_CLEANUP, position: { x: 860, y: 340 }, parent: 'range:root' },
    { id: 'range:root', position: { x: 1220, y: 340 }, parent: null },
  ], [STRAIGHT_RANGE_ENTRANCE]),
  camera: { center: { x: 580, y: 325 }, height: 650, bottomFocus: { worldY: 455, padding: 92 } },
  accent,
  signalHealthScale: options.signalHealthScale ?? 0.72,
  signalSpeedScale: options.signalSpeedScale ?? 0.85,
  ...(options.towerSlots === undefined ? {} : { towerSlots: options.towerSlots }),
});
