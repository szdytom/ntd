import type { ModuleId } from '@prism-bastion/game-core/game/types';
import type { ThoughtBeat, ThoughtSceneValues } from '../types';
import { defineBeat } from './beats';
import { LOADOUT_ADDITION_CADENCE, timedCue } from './cues';
import { explainLoadoutSlot, introduceScene } from './recipes';

export interface StaticPayloadOpeningCopy {
  readonly sectionDeploy: string;
  readonly beatCapture: string;
}

export const STATIC_PAYLOAD_INITIAL_SCENE: Partial<ThoughtSceneValues> = {
  pathProgress: 0,
  towerPadOpacity: 0,
  towerOpacity: 0,
  signalOpacity: 0,
  simulationRate: 1,
};

/**
 * Establishes the shared trigger-carrier-payload grammar. The owning module
 * keeps every effect, comparison, boundary, and cleanup beat in its own file.
 */
export const staticPayloadOpening = (
  moduleId: ModuleId,
  copy: StaticPayloadOpeningCopy,
): readonly ThoughtBeat[] => [
  defineBeat({
    id: 'construct', captionKey: copy.sectionDeploy, flow: 'compile',
    cues: introduceScene({ slots: ['impact-trigger', 'pulse', moduleId] }),
  }),
  defineBeat({
    id: 'show-loadout', captionKey: copy.sectionDeploy, flow: 'compile',
    cues: [
      timedCue('show-trigger', LOADOUT_ADDITION_CADENCE, {
        sectionTitleKey: copy.sectionDeploy,
        overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      }),
      timedCue('show-carrier', LOADOUT_ADDITION_CADENCE, {
        overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
        loadoutVisibleSlots: 2,
      }),
      timedCue('show-payload', 2.2, {
        overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
        loadoutVisibleSlots: 3,
      }),
    ],
  }),
  defineBeat({
    id: 'explain-payload', captionKey: copy.beatCapture, flow: 'payload',
    cues: [explainLoadoutSlot('point-payload', 4.2, copy.beatCapture, 2)],
  }),
];
