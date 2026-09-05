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
import { emberFieldModule } from '@prism-bastion/game-core/modules/ember-field';

const copy = {
  title: 'thoughts.emberField.title',
  summary: 'thoughts.emberField.summary',
  sections: {
    pulse: 'thoughts.emberField.sections.pulse',
    arrivals: 'thoughts.emberField.sections.arrivals',
  },
  beats: {
    capture: 'thoughts.emberField.beats.capture',
    pulse: 'thoughts.emberField.beats.pulse',
    burning: 'thoughts.emberField.beats.burning',
    arrival: 'thoughts.emberField.beats.arrival',
  },
} as const;

/**
 * Transfer: predict how the field's pulses create a separate burning status.
 * Proof: ignite a cluster, observe a burn tick between pulses, then ignite a late arrival.
 * Cast: Impact Trigger, Pulse, three durable signals, and one later entrant.
 * Boundary: deployment is not a one-time blast; later pulses affect later arrivals.
 * Non-goals: exact pulse cadence, status duration, and damage efficiency.
 */
export const emberFieldThought = defineModuleThought(emberFieldModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 139,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 2.2, signalSpeedScale: 0.45 }),
  initialScene: STATIC_PAYLOAD_INITIAL_SCENE,
  beats: [
    ...staticPayloadOpening(emberFieldModule.id, {
      sectionDeploy: copy.sections.pulse,
      beatCapture: copy.beats.capture,
    }),
    defineBeat({
      id: 'deploy-ember-field', captionKey: copy.beats.pulse, flow: 'payload',
      cues: [
        ...fireCapturedRun('ember', {
          carrier: 'pulse',
          inputs: [
            { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'emberLead' },
            { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 52 }, captureAs: 'emberMiddle' },
            { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 70 }, captureAs: 'emberTail' },
          ],
          capture: { type: 'payload-deployed', moduleId: 'ember-field', captureAs: 'emberField' },
          captureTimeout: 14,
          settleDuration: 0.05,
        }),
        waitCue('wait-ember-cluster', {
          waitFor: { type: 'status-applied', occurrence: 3 },
          timeout: 5,
          timelineWait: true,
        }),
        timedCue('settle-ember-pulse', 0.06, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-ember-pulse', captionKey: copy.beats.pulse, flow: 'payload',
      cues: [timedCue('point-ember-cluster', 4.2, {
        transitionDuration: 0.08,
        transition: { simulationRate: 0 },
        ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.pulse, target: { signalRef: 'emberMiddle' } },
        requireSignalState: { signalRef: 'emberMiddle', alive: true, statusId: 'ember-field' },
      })],
    }),
    defineBeat({
      id: 'observe-burning-tick', captionKey: copy.beats.burning, flow: 'impact',
      cues: [
        timedCue('resume-ember-burning', 0.55, {
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-ember-burning-damage', {
          waitFor: { type: 'signal-damaged', occurrence: 2 },
          timeout: 4,
          timelineWait: true,
        }),
        timedCue('settle-ember-burning', 0.05),
      ],
    }),
    defineBeat({
      id: 'show-burning-between-pulses', captionKey: copy.beats.burning, flow: 'impact',
      cues: [showPause({
        id: 'point-burning-signal',
        captionKey: copy.beats.burning,
        target: { signalRef: 'emberLead' },
        requireAlive: 'emberLead',
      })],
    }),
    defineBeat({
      id: 'send-late-ember-target', captionKey: copy.sections.arrivals, flow: 'payload',
      cues: [
        timedCue('spawn-late-ember-target', 0.45, {
          sectionTitleKey: copy.sections.arrivals,
          actions: [{
            type: 'spawn-signal',
            signal: 'block',
            position: { type: 'tower-range-entry', leadDistance: -55 },
            captureAs: 'lateEmberTarget',
          }],
        }),
        timedCue('resume-late-ember-target', 0.6, {
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-late-ember-status', {
          waitForSignalStates: [{ signalRef: 'lateEmberTarget', alive: true, statusId: 'ember-field' }],
          timeout: 4,
          timelineWait: true,
        }),
        timedCue('settle-late-ember-status', 0.06),
      ],
    }),
    defineBeat({
      id: 'show-late-ember-target', captionKey: copy.beats.arrival, flow: 'observe',
      cues: [showPause({
        id: 'point-late-ember-target',
        captionKey: copy.beats.arrival,
        target: { signalRef: 'lateEmberTarget' },
        requireAlive: 'lateEmberTarget',
      })],
    }),
    defineBeat({
      id: 'finish-ember-field', captionKey: copy.sections.arrivals, flow: 'observe',
      cues: finishRun('finish-ember', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
