import type { ModuleDefinition } from '../../modules/types';
import type { ModuleId } from '../../game/types';
import { straightRangePassScene } from '../scenes';
import type { ThoughtDefinition, ThoughtEventMatcher, ThoughtOverlayTarget } from '../types';
import { defineBeat } from './beats';
import { defineModuleThought } from './define';
import { timedCue, waitCue } from './cues';
import { explainLoadoutSlot, introduceScene } from './recipes';
import { finishRun, fireCapturedRun, showPause } from './sequences';

export interface StaticPayloadCopy {
  readonly title: string;
  readonly summary: string;
  readonly section: string;
  readonly beatTrigger: string;
  readonly beatEffect: string;
}

interface StaticPayloadOptions {
  readonly module: ModuleDefinition;
  readonly copy: StaticPayloadCopy;
  readonly seed: number;
  readonly carrier: ModuleId;
  readonly effect?: ThoughtEventMatcher;
  readonly effectTarget: ThoughtOverlayTarget;
  readonly aliveRef?: string;
  readonly observe?: number;
  readonly effectTimeout?: number;
}

/**
 * Builds the static-payload thought shared by the deployed modules. A trigger
 * releases the payload at the impact point, and the payload then produces its
 * authored effect on the signals walking through it.
 */
export const buildStaticPayloadThought = (options: StaticPayloadOptions): ThoughtDefinition => {
  const { module, copy, seed, carrier, effect, effectTarget, aliveRef = 'target', observe, effectTimeout } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 4, signalSpeedScale: 0.5 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct', captionKey: copy.section, flow: 'compile',
        cues: introduceScene({ slots: ['impact-trigger', carrier, module.id] }),
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
        id: 'explain', captionKey: copy.beatTrigger, flow: 'payload',
        cues: [explainLoadoutSlot('point-trigger', 4.2, copy.beatTrigger, 0)],
      }),
      defineBeat({
        id: 'deploy', captionKey: copy.beatEffect, flow: 'payload',
        cues: [
          ...fireCapturedRun('fire', {
            carrier,
            inputs: [
              { signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' },
            ],
            captureAs: 'shot',
            capture: { type: 'payload-deployed', moduleId: module.id, captureAs: 'payloadRef' },
            captureTimeout: 14,
            settleDuration: 0.4,
          }),
          ...(effect ? [waitCue('effect', { waitFor: effect, timeout: effectTimeout ?? 8, timelineWait: true })] : []),
          ...(observe ? [timedCue('observe', observe, {
            actions: [{ type: 'set-tower-casting', enabled: false }],
          })] : []),
        ],
      }),
      defineBeat({
        id: 'show', captionKey: copy.beatEffect, flow: 'payload',
        cues: [showPause({ id: 'point-effect', captionKey: copy.beatEffect, target: effectTarget, requireAlive: aliveRef })],
      }),
      defineBeat({
        id: 'finish', captionKey: copy.section, flow: 'observe',
        cues: finishRun('finish', -Math.PI / 2),
      }),
    ],
  });
};
