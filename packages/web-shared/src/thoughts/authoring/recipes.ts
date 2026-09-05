import type { ModuleId } from '@prism-bastion/game-core/game/types';
import type { ThoughtCue } from '../types';
import { timedCue } from './cues';

export interface SceneIntroductionOptions {
  readonly slots: readonly ModuleId[];
}

/** The common Ponder-style empty-stage reveal used by local thought scenes. */
export const introduceScene = ({ slots }: SceneIntroductionOptions): readonly ThoughtCue[] => [
  timedCue('blank', 0.5, {
    actions: [{ type: 'setup', slots }],
    loadoutMode: 'hidden',
  }),
  timedCue('draw-road', 1.2, {
    transition: { pathProgress: 1 },
    ease: 'smooth',
  }),
  timedCue('show-pad', 0.6, {
    transition: { towerPadOpacity: 1 },
    ease: 'ease-out',
  }),
  timedCue('place-tower', 0.9, {
    transition: { towerPadOpacity: 0, towerOpacity: 1 },
    ease: 'ease-out',
    placementBurst: true,
  }),
];

export const explainLoadoutSlot = (
  id: string,
  duration: number,
  textKey: string,
  slot: number,
): ThoughtCue => timedCue(id, duration, {
  overlay: { type: 'caption', textKey, target: { slot } },
  highlightSlots: [slot],
});
