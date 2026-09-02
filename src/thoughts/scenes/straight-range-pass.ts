import type { ThoughtSceneFactory } from '../authoring';

export interface StraightRangePassOptions {
  readonly towerSlots?: number;
  readonly signalHealthScale?: number;
  readonly signalSpeedScale?: number;
}

/**
 * A neutral single-road stage suited to projectile, modifier, area, trigger,
 * and static-payload demonstrations. Storyboards own its choreography.
 */
export const straightRangePassScene = (
  options: StraightRangePassOptions = {},
): ThoughtSceneFactory => ({ thoughtId, accent }) => ({
  id: `${thoughtId}:straight-range-pass`,
  path: [{ x: -60, y: 340 }, { x: 1220, y: 340 }],
  tower: { x: 580, y: 455 },
  camera: { center: { x: 580, y: 325 }, height: 650, bottomFocus: { worldY: 455, padding: 92 } },
  accent,
  signalHealthScale: options.signalHealthScale ?? 0.72,
  signalSpeedScale: options.signalSpeedScale ?? 0.85,
  ...(options.towerSlots === undefined ? {} : { towerSlots: options.towerSlots }),
});
