import type { ModuleDefinition } from '../../modules/types';
import { straightRangePassScene } from '../scenes';
import type { ThoughtDefinition } from '../types';
import { defineBeat } from './beats';
import { defineModuleThought } from './define';
import { timedCue, waitCue } from './cues';
import { explainLoadoutSlot, introduceScene } from './recipes';
import { finishRun, fireCapturedRun, showPause } from './sequences';

export interface TriggerCopy {
  readonly title: string;
  readonly summary: string;
  readonly section: string;
  readonly beatTrigger: string;
  readonly beatRelease: string;
}

interface TriggerOptions {
  readonly module: ModuleDefinition;
  readonly copy: TriggerCopy;
  readonly seed: number;
}

/**
 * Builds the time/positional trigger thoughts. A pulse carries the trigger and
 * a Toxic Cloud payload; when the trigger condition is met it releases the
 * cloud, whose corrosive status provides the observable proof.
 */
export const buildTriggerThought = (options: TriggerOptions): ThoughtDefinition => {
  const { module, copy, seed } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 4, signalSpeedScale: 0.5 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct', captionKey: copy.section, flow: 'compile',
        cues: introduceScene({ slots: [module.id, 'pulse', 'toxic-cloud'] }),
      }),
      defineBeat({
        id: 'show', captionKey: copy.section, flow: 'compile',
        cues: [
          timedCue('show-trigger', 0.65, {
            sectionTitleKey: copy.section,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 1,
          }),
          timedCue('show-carrier', 0.55, { overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 2 }),
          timedCue('show-payload', 2.2, { overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 3 }),
        ],
      }),
      defineBeat({
        id: 'explain', captionKey: copy.beatTrigger, flow: 'compile',
        cues: [explainLoadoutSlot('point-trigger', 4.2, copy.beatTrigger, 0)],
      }),
      defineBeat({
        id: 'deploy', captionKey: copy.beatRelease, flow: 'payload',
        cues: [
          ...fireCapturedRun('fire', {
            carrier: 'pulse',
            inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
            captureAs: 'shot',
            capture: { type: 'payload-deployed', moduleId: 'toxic-cloud', captureAs: 'cloud' },
            captureTimeout: 14,
            settleDuration: 0.4,
          }),
          waitCue('effect', {
            waitFor: { type: 'status-applied', occurrence: 1, captureAs: 'corroded' },
            timeout: 8,
            timelineWait: true,
          }),
        ],
      }),
      defineBeat({
        id: 'show', captionKey: copy.beatRelease, flow: 'payload',
        cues: [showPause({ id: 'point-release', captionKey: copy.beatRelease, target: { signalRef: 'target' }, requireAlive: 'target' })],
      }),
      defineBeat({
        id: 'finish', captionKey: copy.section, flow: 'observe',
        cues: finishRun('finish', -Math.PI / 2),
      }),
    ],
  });
};
