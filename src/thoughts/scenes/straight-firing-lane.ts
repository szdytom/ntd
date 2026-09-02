import type { ThoughtSceneFactory } from '../authoring';

export interface StraightFiringLaneOptions {
  readonly towerSlots?: number;
  readonly signalHealthScale?: number;
  readonly signalSpeedScale?: number;
}

/** A road placed on the tower's firing axis, making pierce contacts legible. */
export const straightFiringLaneScene = (
  options: StraightFiringLaneOptions = {},
): ThoughtSceneFactory => ({ thoughtId, accent }) => ({
  id: `${thoughtId}:straight-firing-lane`,
  path: [{ x: 280, y: 340 }, { x: 1_280, y: 340 }],
  tower: { x: 150, y: 340 },
  camera: { center: { x: 620, y: 325 }, height: 650, bottomFocus: { worldY: 455, padding: 92 } },
  accent,
  signalHealthScale: options.signalHealthScale ?? 1,
  signalSpeedScale: options.signalSpeedScale ?? 0.72,
  ...(options.towerSlots === undefined ? {} : { towerSlots: options.towerSlots }),
});
