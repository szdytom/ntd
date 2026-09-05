import {
  defineBeat,
  defineModuleThought,
  finishRun,
  fireCapturedRun,
  showPause,
  STATIC_PAYLOAD_INITIAL_SCENE,
  staticPayloadOpening,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { toxicCloudModule } from '@prism-bastion/game-core/modules/toxic-cloud';

const copy = {
  title: 'thoughts.toxicCloud.title',
  summary: 'thoughts.toxicCloud.summary',
  sections: {
    corrode: 'thoughts.toxicCloud.sections.corrode',
    refresh: 'thoughts.toxicCloud.sections.refresh',
  },
  beats: {
    capture: 'thoughts.toxicCloud.beats.capture',
    pulse: 'thoughts.toxicCloud.beats.pulse',
    refresh: 'thoughts.toxicCloud.beats.refresh',
    arrival: 'thoughts.toxicCloud.beats.arrival',
  },
} as const;

/**
 * Transfer: predict that the cloud repeatedly reapplies corrosion while it persists.
 * Proof: corrode two signals twice, then let a later entrant receive the status.
 * Cast: Impact Trigger, Pulse, two durable signals, and one later entrant.
 * Boundary: the cloud is a persistent pulsing payload, not a one-time impact effect.
 * Non-goals: exact pulse cadence, corrosion damage, and comparison with Ember Field.
 */
export const toxicCloudThought = defineModuleThought(toxicCloudModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 149,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 2.2, signalSpeedScale: 0.48 }),
  initialScene: STATIC_PAYLOAD_INITIAL_SCENE,
  beats: [
    ...staticPayloadOpening(toxicCloudModule.id, {
      sectionDeploy: copy.sections.corrode,
      beatCapture: copy.beats.capture,
    }),
    defineBeat({
      id: 'deploy-toxic-cloud', captionKey: copy.beats.pulse, flow: 'payload',
      cues: [
        ...fireCapturedRun('toxic', {
          carrier: 'pulse',
          inputs: [
            { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'toxicLead' },
            { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 64 }, captureAs: 'toxicTail' },
          ],
          capture: { type: 'payload-deployed', moduleId: 'toxic-cloud', captureAs: 'toxicCloud' },
          captureTimeout: 14,
          settleDuration: 0.04,
        }),
        waitCue('wait-first-toxic-pulse', {
          waitFor: { type: 'status-applied', occurrence: 2 },
          timeout: 5,
          timelineWait: true,
        }),
        timedCue('settle-first-toxic-pulse', 0.06, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-toxic-pulse', captionKey: copy.beats.pulse, flow: 'payload',
      cues: [timedCue('point-toxic-pulse', 4.2, {
        transitionDuration: 0.08,
        transition: { simulationRate: 0 },
        ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.pulse, target: { signalRef: 'toxicTail' } },
        requireSignalState: { signalRef: 'toxicTail', alive: true, statusId: 'toxic-cloud' },
      })],
    }),
    defineBeat({
      id: 'refresh-corrosion', captionKey: copy.beats.refresh, flow: 'impact',
      cues: [
        timedCue('resume-toxic-refresh', 0.55, {
          sectionTitleKey: copy.sections.refresh,
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-second-toxic-pulse', {
          waitForProjectileStates: [{
            projectileRef: 'toxicCloud',
            alive: true,
            minimumTriggerCount: 2,
          }],
          timeout: 4,
          timelineWait: true,
        }),
        timedCue('settle-toxic-refresh', 0.05),
      ],
    }),
    defineBeat({
      id: 'show-corrosion-refresh', captionKey: copy.beats.refresh, flow: 'impact',
      cues: [showPause({
        id: 'point-corrosion-refresh',
        captionKey: copy.beats.refresh,
        target: { signalRef: 'toxicLead' },
        requireAlive: 'toxicLead',
      })],
    }),
    defineBeat({
      id: 'send-late-toxic-target', captionKey: copy.beats.arrival, flow: 'payload',
      cues: [
        timedCue('spawn-late-toxic-target', 0.45, {
          actions: [{
            type: 'spawn-signal',
            signal: 'block',
            position: { type: 'tower-range-entry', leadDistance: -55 },
            captureAs: 'lateToxicTarget',
          }],
        }),
        timedCue('resume-late-toxic-target', 0.6, {
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-late-toxic-status', {
          waitForSignalStates: [{ signalRef: 'lateToxicTarget', alive: true, statusId: 'toxic-cloud' }],
          timeout: 4,
          timelineWait: true,
        }),
        timedCue('settle-late-toxic-status', 0.06),
      ],
    }),
    defineBeat({
      id: 'show-late-toxic-target', captionKey: copy.beats.arrival, flow: 'observe',
      cues: [showPause({
        id: 'point-late-toxic-target',
        captionKey: copy.beats.arrival,
        target: { signalRef: 'lateToxicTarget' },
        requireAlive: 'lateToxicTarget',
      })],
    }),
    defineBeat({
      id: 'finish-toxic-cloud', captionKey: copy.sections.refresh, flow: 'observe',
      cues: finishRun('finish-toxic', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
