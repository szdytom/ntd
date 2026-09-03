import { createRouteMap } from '../../game/path';
import type { ThoughtSceneFactory } from '../authoring';

export const STRAIGHT_LANE_ENTRANCE = 'lane:entrance';
export const STRAIGHT_LANE_CLEANUP = 'lane:cleanup';

export interface StraightFiringLaneOptions {
  readonly towerSlots?: number;
  readonly signalHealthScale?: number;
  readonly signalSpeedScale?: number;
}

/**
 * A road placed on the tower's firing axis, making pierce contacts legible.
 * The cleanup node sits past the tower's range so an ending can wait for every
 * signal to leave the lane before removing it.
 */
export const straightFiringLaneScene = (
  options: StraightFiringLaneOptions = {},
): ThoughtSceneFactory => ({ thoughtId, accent }) => ({
  id: `${thoughtId}:straight-firing-lane`,
  path: [{ x: 280, y: 340 }, { x: 620, y: 340 }, { x: 1_280, y: 340 }],
  tower: { x: 150, y: 340 },
  graph: createRouteMap([
    { id: STRAIGHT_LANE_ENTRANCE, position: { x: 280, y: 340 }, parent: STRAIGHT_LANE_CLEANUP },
    { id: STRAIGHT_LANE_CLEANUP, position: { x: 620, y: 340 }, parent: 'lane:root' },
    { id: 'lane:root', position: { x: 1_280, y: 340 }, parent: null },
  ], [STRAIGHT_LANE_ENTRANCE]),
  camera: { center: { x: 620, y: 325 }, height: 650, bottomFocus: { worldY: 455, padding: 92 } },
  accent,
  signalHealthScale: options.signalHealthScale ?? 1,
  signalSpeedScale: options.signalSpeedScale ?? 0.72,
  ...(options.towerSlots === undefined ? {} : { towerSlots: options.towerSlots }),
});
