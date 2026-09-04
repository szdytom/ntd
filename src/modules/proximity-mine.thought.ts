import {
  defineBeat,
  defineModuleThought,
  finishRun,
  fireCapturedRun,
  STATIC_PAYLOAD_INITIAL_SCENE,
  staticPayloadOpening,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { proximityMineModule } from './proximity-mine';

const copy = {
  title: 'thoughts.proximityMine.title',
  summary: 'thoughts.proximityMine.summary',
  sections: {
    deploy: 'thoughts.proximityMine.sections.deploy',
    detonate: 'thoughts.proximityMine.sections.detonate',
  },
  beats: {
    capture: 'thoughts.proximityMine.beats.capture',
    arm: 'thoughts.proximityMine.beats.arm',
    blast: 'thoughts.proximityMine.beats.blast',
    spent: 'thoughts.proximityMine.beats.spent',
  },
} as const;

/**
 * Transfer: predict when a mine becomes dangerous and what one detonation affects.
 * Proof: freeze the newly deployed mine, then let one approach damage a cluster.
 * Cast: Impact Trigger, Pulse, one durable lead signal, and two nearby signals.
 * Boundary: the mine is consumed by its first detonation.
 * Non-goals: exact sensor radius, blast damage, and trigger-carrier alternatives.
 */
export const proximityMineThought = defineModuleThought(proximityMineModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 127,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 2, signalSpeedScale: 0.5 }),
  initialScene: STATIC_PAYLOAD_INITIAL_SCENE,
  beats: [
    ...staticPayloadOpening(proximityMineModule.id, {
      sectionDeploy: copy.sections.deploy,
      beatCapture: copy.beats.capture,
    }),
    defineBeat({
      id: 'deploy-mine', captionKey: copy.beats.arm, flow: 'payload',
      cues: fireCapturedRun('mine', {
        carrier: 'pulse',
        inputs: [
          { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'mineLead' },
          { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 52 }, captureAs: 'mineMiddle' },
          { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 70 }, captureAs: 'mineTail' },
        ],
        capture: { type: 'payload-deployed', moduleId: 'proximity-mine', captureAs: 'mine' },
        captureTimeout: 14,
        settleDuration: 0.02,
      }),
    }),
    defineBeat({
      id: 'show-mine-arming', captionKey: copy.beats.arm, flow: 'payload',
      cues: [timedCue('point-unarmed-mine', 4.2, {
        transitionDuration: 0.05,
        transition: { simulationRate: 0 },
        ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.arm, target: { projectileRef: 'mine' } },
      })],
    }),
    defineBeat({
      id: 'detonate-mine', captionKey: copy.beats.blast, flow: 'impact',
      cues: [
        timedCue('resume-armed-mine', 0.65, {
          sectionTitleKey: copy.sections.detonate,
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-mine-blast', {
          waitFor: { type: 'signal-damaged', occurrence: 4 },
          timeout: 8,
          timelineWait: true,
        }),
        timedCue('settle-mine-blast', 0.12, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-mine-blast', captionKey: copy.beats.blast, flow: 'impact',
      cues: [timedCue('point-mine-cluster', 4.2, {
        transitionDuration: 0.35,
        transition: { simulationRate: 0 },
        ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.blast, target: { signalRef: 'mineLead' } },
        requireSignalState: { signalRef: 'mineLead', alive: true },
      })],
    }),
    defineBeat({
      id: 'show-spent-mine', captionKey: copy.beats.spent, flow: 'observe',
      cues: [timedCue('point-spent-mine', 4.2, {
        overlay: { type: 'caption', textKey: copy.beats.spent, target: { signalRef: 'mineLead' } },
        requireSignalState: { signalRef: 'mineLead', alive: true },
      })],
    }),
    defineBeat({
      id: 'finish-mine', captionKey: copy.sections.detonate, flow: 'observe',
      cues: finishRun('finish-mine', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
