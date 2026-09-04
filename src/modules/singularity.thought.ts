import {
  defineBeat,
  defineModuleThought,
  fireCapturedRun,
  showPause,
  STATIC_PAYLOAD_INITIAL_SCENE,
  staticPayloadOpening,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { singularityModule } from './singularity';

const copy = {
  title: 'thoughts.singularity.title',
  summary: 'thoughts.singularity.summary',
  sections: {
    deploy: 'thoughts.singularity.sections.deploy',
    direction: 'thoughts.singularity.sections.direction',
  },
  beats: {
    capture: 'thoughts.singularity.beats.capture',
    field: 'thoughts.singularity.beats.field',
    ahead: 'thoughts.singularity.beats.ahead',
    behind: 'thoughts.singularity.beats.behind',
  },
} as const;

/**
 * Transfer: predict the direction a singularity displaces signals on either side.
 * Proof: place one signal at the center and another behind it, then watch both converge.
 * Cast: Impact Trigger, Pulse, and two slow durable signals on one route.
 * Boundary: pull points toward the center, so it can move a trailing signal forward.
 * Non-goals: exact displacement rate, field radius, and status-modifier propagation.
 */
export const singularityThought = defineModuleThought(singularityModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 151,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 3, signalSpeedScale: 0.5 }),
  initialScene: STATIC_PAYLOAD_INITIAL_SCENE,
  beats: [
    ...staticPayloadOpening(singularityModule.id, {
      sectionDeploy: copy.sections.deploy,
      beatCapture: copy.beats.capture,
    }),
    defineBeat({
      id: 'deploy-singularity', captionKey: copy.beats.field, flow: 'payload',
      cues: fireCapturedRun('singularity', {
        carrier: 'pulse',
        inputs: [
          { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'singularityAhead' },
          { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 100 }, captureAs: 'singularityBehind' },
        ],
        capture: { type: 'payload-deployed', moduleId: 'singularity', captureAs: 'singularityField' },
        captureTimeout: 14,
        settleDuration: 0.04,
      }),
    }),
    defineBeat({
      id: 'show-singularity-field', captionKey: copy.beats.field, flow: 'payload',
      cues: [timedCue('point-singularity-field', 4.2, {
        transitionDuration: 0.08,
        transition: { simulationRate: 0 },
        ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.field, target: { projectileRef: 'singularityField' } },
      })],
    }),
    defineBeat({
      id: 'gather-singularity-signals', captionKey: copy.sections.direction, flow: 'payload',
      cues: [timedCue('observe-singularity-pull', 1.8, {
        sectionTitleKey: copy.sections.direction,
        transition: { simulationRate: 1 },
        ease: 'smooth',
        actions: [{ type: 'set-tower-casting', enabled: false }],
      })],
    }),
    defineBeat({
      id: 'show-ahead-pull', captionKey: copy.beats.ahead, flow: 'observe',
      cues: [showPause({
        id: 'point-singularity-ahead',
        captionKey: copy.beats.ahead,
        target: { signalRef: 'singularityAhead' },
        requireAlive: 'singularityAhead',
      })],
    }),
    defineBeat({
      id: 'show-behind-pull', captionKey: copy.beats.behind, flow: 'observe',
      cues: [timedCue('point-singularity-behind', 4.2, {
        overlay: { type: 'caption', textKey: copy.beats.behind, target: { signalRef: 'singularityBehind' } },
        requireSignalState: { signalRef: 'singularityBehind', alive: true },
      })],
    }),
    defineBeat({
      id: 'finish-singularity', captionKey: copy.sections.direction, flow: 'observe',
      cues: [
        timedCue('finish-singularity-restore', 1.35, {
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('finish-singularity-clear', {
          waitForSignalsPastNode: STRAIGHT_RANGE_CLEANUP,
          timeout: 30,
          timelineWait: true,
        }),
        timedCue('finish-singularity-delete', 0.2, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'delete-signals' },
          ],
        }),
        waitCue('finish-singularity-energy', {
          waitForTowerEnergy: true,
          timeout: 20,
          timelineWait: true,
        }),
        timedCue('finish-singularity-settle', 0.5, {
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 },
          ease: 'smooth',
        }),
      ],
    }),
  ],
});
