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
import { teslaNodeModule } from '@prism-bastion/game-core/modules/tesla-node';

const copy = {
  title: 'thoughts.teslaNode.title',
  summary: 'thoughts.teslaNode.summary',
  sections: {
    chain: 'thoughts.teslaNode.sections.chain',
    repeat: 'thoughts.teslaNode.sections.repeat',
  },
  beats: {
    capture: 'thoughts.teslaNode.beats.capture',
    primary: 'thoughts.teslaNode.beats.primary',
    chain: 'thoughts.teslaNode.beats.chain',
    repeat: 'thoughts.teslaNode.beats.repeat',
  },
} as const;

/**
 * Transfer: predict how each sentry attack selects, chains, and repeats.
 * Proof: one discharge damages a primary and a nearby secondary, then fires again.
 * Cast: Impact Trigger, Pulse, and two durable signals inside chain distance.
 * Boundary: one attack chains to one nearby secondary rather than the whole group.
 * Non-goals: exact radii, damage values, and maximum attack count.
 */
export const teslaNodeThought = defineModuleThought(teslaNodeModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 137,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 2.4, signalSpeedScale: 0.42 }),
  initialScene: STATIC_PAYLOAD_INITIAL_SCENE,
  beats: [
    ...staticPayloadOpening(teslaNodeModule.id, {
      sectionDeploy: copy.sections.chain,
      beatCapture: copy.beats.capture,
    }),
    defineBeat({
      id: 'deploy-tesla-node', captionKey: copy.sections.chain, flow: 'payload',
      cues: [
        ...fireCapturedRun('tesla', {
          carrier: 'pulse',
          inputs: [
            { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'teslaPrimary' },
            { signal: 'block', position: { type: 'tower-range-entry', leadDistance: 70 }, captureAs: 'teslaSecondary' },
          ],
          capture: { type: 'payload-deployed', moduleId: 'tesla-node', captureAs: 'teslaNode' },
          captureTimeout: 14,
          settleDuration: 0.04,
        }),
        waitCue('wait-first-tesla-chain', {
          waitFor: { type: 'signal-damaged', occurrence: 3 },
          timeout: 8,
          timelineWait: true,
        }),
        timedCue('settle-first-tesla-chain', 0.08, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-tesla-primary', captionKey: copy.beats.primary, flow: 'impact',
      cues: [timedCue('point-tesla-primary', 4.2, {
        transitionDuration: 0.08,
        transition: { simulationRate: 0 },
        ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.primary, target: { signalRef: 'teslaPrimary' } },
        requireSignalState: { signalRef: 'teslaPrimary', alive: true },
      })],
    }),
    defineBeat({
      id: 'show-tesla-chain', captionKey: copy.beats.chain, flow: 'impact',
      cues: [timedCue('point-tesla-secondary', 4.2, {
        overlay: { type: 'caption', textKey: copy.beats.chain, target: { signalRef: 'teslaSecondary' } },
        requireSignalState: { signalRef: 'teslaSecondary', alive: true },
      })],
    }),
    defineBeat({
      id: 'repeat-tesla-attack', captionKey: copy.beats.repeat, flow: 'payload',
      cues: [
        timedCue('resume-tesla-node', 0.7, {
          sectionTitleKey: copy.sections.repeat,
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-second-tesla-chain', {
          waitFor: { type: 'signal-damaged', occurrence: 5 },
          timeout: 5,
          timelineWait: true,
        }),
        timedCue('settle-second-tesla-chain', 0.08),
      ],
    }),
    defineBeat({
      id: 'show-tesla-repeat', captionKey: copy.beats.repeat, flow: 'observe',
      cues: [showPause({
        id: 'point-tesla-repeat',
        captionKey: copy.beats.repeat,
        target: { projectileRef: 'teslaNode' },
      })],
    }),
    defineBeat({
      id: 'finish-tesla', captionKey: copy.sections.repeat, flow: 'observe',
      cues: finishRun('finish-tesla', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
