import type { ModuleDefinition } from '../../modules/types';
import type { ModuleId } from '../../game/types';
import { straightRangePassScene } from '../scenes';
import type { ThoughtDefinition, ThoughtEventMatcher, ThoughtOverlayTarget } from '../types';
import { defineBeat } from './beats';
import { defineModuleThought } from './define';
import { timedCue, waitCue } from './cues';
import { explainLoadoutSlot, introduceScene } from './recipes';
import { finishRun, fireCapturedRun, showPause } from './sequences';

export interface TrailWakeCopy {
  readonly title: string;
  readonly summary: string;
  readonly section: string;
  readonly beatSettle: string;
  readonly beatAffect: string;
}

interface TrailWakeOptions {
  readonly module: ModuleDefinition;
  readonly copy: TrailWakeCopy;
  readonly seed: number;
  readonly carrier: ModuleId;
  readonly wake: ThoughtEventMatcher;
  readonly wakeTarget: ThoughtOverlayTarget;
  readonly wakeRef: string;
}

/**
 * Builds the persistent spatial-effect thought shared by Starfire Wake and
 * Riftwake. A collisionless carrier lays the trail along the lane; a signal
 * that walks over it receives the authored effect.
 */
export const buildTrailWakeThought = (options: TrailWakeOptions): ThoughtDefinition => {
  const { module, copy, seed, carrier, wake, wakeTarget, wakeRef } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.5 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct', captionKey: copy.section, flow: 'compile',
        cues: introduceScene({ slots: [module.id, carrier] }),
      }),
      defineBeat({
        id: 'show', captionKey: copy.section, flow: 'compile',
        cues: [
          timedCue('show-mod', 0.75, {
            sectionTitleKey: copy.section,
            overlay: { type: 'loadout', target: 'tower', placement: 'right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 1,
          }),
          timedCue('show-carrier', 2.45, { overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2 }),
        ],
      }),
      defineBeat({
        id: 'explain', captionKey: copy.beatSettle, flow: 'trail',
        cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatSettle, 0)],
      }),
      defineBeat({
        id: 'fire', captionKey: copy.beatAffect, flow: 'trail',
        cues: [
          ...fireCapturedRun('fire', {
            carrier,
            inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
            captureAs: 'beam',
            settleDuration: 0.4,
          }),
          waitCue('affect', {
            waitFor: wake,
            timeout: 10,
            timelineWait: true,
          }),
        ],
      }),
      defineBeat({
        id: 'show', captionKey: copy.beatAffect, flow: 'trail',
        cues: [showPause({ id: 'point-affect', captionKey: copy.beatAffect, target: wakeTarget, requireAlive: wakeRef })],
      }),
      defineBeat({
        id: 'finish', captionKey: copy.section, flow: 'observe',
        cues: finishRun('finish', -Math.PI / 2),
      }),
    ],
  });
};
