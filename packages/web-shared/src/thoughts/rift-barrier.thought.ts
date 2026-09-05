import {
  defineBeat,
  defineModuleThought,
  finishRun,
  fireCapturedRun,
  resetTo,
  showPause,
  STATIC_PAYLOAD_INITIAL_SCENE,
  staticPayloadOpening,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { riftBarrierModule } from '@prism-bastion/game-core/modules/rift-barrier';

const copy = {
  title: 'thoughts.riftBarrier.title',
  summary: 'thoughts.riftBarrier.summary',
  sections: {
    shape: 'thoughts.riftBarrier.sections.shape',
    linger: 'thoughts.riftBarrier.sections.linger',
  },
  beats: {
    capture: 'thoughts.riftBarrier.beats.capture',
    hollow: 'thoughts.riftBarrier.beats.hollow',
    crossing: 'thoughts.riftBarrier.beats.crossing',
    linger: 'thoughts.riftBarrier.beats.linger',
  },
} as const;

/**
 * Transfer: predict where a Rift Barrier deals damage and how long the shape matters.
 * Proof: let a signal leave the hollow center through one edge, then cross a lingering edge.
 * Cast: Impact Trigger, Pulse, one durable crossing signal, and one late entrant.
 * Boundary: the hollow interior is safe, while the rifts outlive their anchor briefly.
 * Non-goals: overlap priority, exact contact width, and alternate barrier orientations.
 */
export const riftBarrierThought = defineModuleThought(riftBarrierModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 131,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 0.6, signalSpeedScale: 0.6 }),
  initialScene: STATIC_PAYLOAD_INITIAL_SCENE,
  beats: [
    ...staticPayloadOpening(riftBarrierModule.id, {
      sectionDeploy: copy.sections.shape,
      beatCapture: copy.beats.capture,
    }),
    defineBeat({
      id: 'deploy-barrier', captionKey: copy.beats.hollow, flow: 'payload',
      cues: fireCapturedRun('barrier', {
        carrier: 'pulse',
        inputs: [
          { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'barrierTarget' },
        ],
        capture: { type: 'payload-deployed', moduleId: 'rift-barrier', captureAs: 'barrierAnchor' },
        captureTimeout: 14,
        settleDuration: 0.1,
      }),
    }),
    defineBeat({
      id: 'show-hollow-center', captionKey: copy.beats.hollow, flow: 'payload',
      cues: [showPause({
        id: 'point-hollow-center',
        captionKey: copy.beats.hollow,
        target: { projectileRef: 'barrierAnchor' },
      })],
    }),
    defineBeat({
      id: 'cross-barrier-edge', captionKey: copy.beats.crossing, flow: 'impact',
      cues: [
        timedCue('resume-barrier-crossing', 0.8, {
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-barrier-crossing', {
          waitFor: { type: 'signal-damaged', occurrence: 2 },
          timeout: 8,
          timelineWait: true,
        }),
        timedCue('settle-barrier-crossing', 0.12, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-barrier-crossing', captionKey: copy.beats.crossing, flow: 'impact',
      cues: [showPause({
        id: 'point-barrier-crossing',
        captionKey: copy.beats.crossing,
        target: { signalRef: 'barrierTarget' },
        requireAlive: 'barrierTarget',
      })],
    }),
    defineBeat({
      id: 'prepare-lingering-barrier', captionKey: copy.sections.linger, flow: 'compile',
      cues: resetTo(
        'linger-barrier',
        ['impact-trigger', 'pulse', 'rift-barrier'],
        copy.sections.linger,
        3,
        'top-right',
      ),
    }),
    defineBeat({
      id: 'deploy-lingering-barrier', captionKey: copy.sections.linger, flow: 'payload',
      cues: [
        ...fireCapturedRun('linger', {
          carrier: 'pulse',
          inputs: [
            { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 44 } },
          ],
          capture: { type: 'payload-deployed', moduleId: 'rift-barrier', captureAs: 'lingeringAnchor' },
          captureTimeout: 14,
          settleDuration: 0.15,
        }),
        waitCue('wait-barrier-anchor-expire', {
          waitForProjectileStates: [{ projectileRef: 'lingeringAnchor', alive: false }],
          timeout: 8,
          timelineWait: true,
        }),
        timedCue('spawn-late-barrier-target', 0.45, {
          actions: [{
            type: 'spawn-signal',
            signal: 'block',
            position: { type: 'tower-range-entry', leadDistance: -70 },
            captureAs: 'lateBarrierTarget',
          }],
        }),
        waitCue('wait-lingering-crossing', {
          waitFor: { type: 'signal-damaged', occurrence: 2 },
          timeout: 4,
          timelineWait: true,
        }),
        timedCue('settle-lingering-crossing', 0.12),
      ],
    }),
    defineBeat({
      id: 'show-lingering-barrier', captionKey: copy.beats.linger, flow: 'observe',
      cues: [showPause({
        id: 'point-lingering-crossing',
        captionKey: copy.beats.linger,
        target: { signalRef: 'lateBarrierTarget' },
        requireAlive: 'lateBarrierTarget',
      })],
    }),
    defineBeat({
      id: 'finish-barrier', captionKey: copy.sections.linger, flow: 'observe',
      cues: finishRun('finish-barrier', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
