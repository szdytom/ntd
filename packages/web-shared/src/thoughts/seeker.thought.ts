import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  finishRun,
  fireCapturedRun,
  introduceScene,
  resetWithLoadoutReplacement,
  settleTowerForReset,
  showPause,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { seekerModule } from '@prism-bastion/game-core/modules/seeker';

const copy = {
  title: 'thoughts.seeker.title',
  summary: 'thoughts.seeker.summary',
  sections: {
    prediction: 'thoughts.seeker.sections.prediction',
    fork: 'thoughts.seeker.sections.fork',
  },
  beats: {
    hone: 'thoughts.seeker.beats.hone',
    prediction: 'thoughts.seeker.beats.prediction',
    split: 'thoughts.seeker.beats.split',
    gather: 'thoughts.seeker.beats.gather',
    focused: 'thoughts.seeker.beats.focused',
  },
} as const;

export const seekerThought = defineModuleThought(seekerModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 181,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 10, signalSpeedScale: 0.8 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-prediction', captionKey: copy.sections.prediction, flow: 'compile',
      cues: introduceScene({ slots: ['seeker', 'pulse'] }),
    }),
    defineBeat({
      id: 'show-prediction-loadout', captionKey: copy.sections.prediction, flow: 'compile',
      cues: [
        timedCue('show-seeker', 0.75, {
          sectionTitleKey: copy.sections.prediction,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        }),
        timedCue('show-pulse', 2.45, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2,
        }),
      ],
    }),
    defineBeat({
      id: 'explain-seeker', captionKey: copy.beats.hone, flow: 'compile',
      cues: [explainLoadoutSlot('point-seeker', 4.2, copy.beats.hone, 0)],
    }),
    defineBeat({
      id: 'fire-predicted-pulse', captionKey: copy.beats.prediction, flow: 'impact',
      cues: fireCapturedRun('predicted-pulse', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 56 }, captureAs: 'predictedTarget' }],
        capture: { type: 'projectile-hit', moduleId: 'seeker' },
      }),
    }),
    defineBeat({
      id: 'show-prediction-boundary', captionKey: copy.beats.prediction, flow: 'observe',
      cues: [showPause({
        id: 'point-prediction-boundary', captionKey: copy.beats.prediction,
        target: { signalRef: 'predictedTarget' }, requireAlive: 'predictedTarget',
      })],
    }),
    defineBeat({
      id: 'construct-fork-baseline', captionKey: copy.sections.fork, flow: 'compile',
      cues: resetWithLoadoutReplacement('fork-baseline', ['fork', 'pulse'], copy.sections.fork),
    }),
    defineBeat({
      id: 'fire-fork-baseline', captionKey: copy.beats.split, flow: 'cast',
      cues: fireCapturedRun('fork-baseline', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 92 }, captureAs: 'forkTarget' }],
        capture: { type: 'projectile-spawned', moduleId: 'fork', captureAs: 'forkProjectiles' },
        settleDuration: 0.12,
      }),
    }),
    defineBeat({
      id: 'show-fork-spread', captionKey: copy.beats.split, flow: 'cast',
      cues: [showPause({
        id: 'point-fork-spread', captionKey: copy.beats.split,
        target: { projectileGroupRef: 'forkProjectiles' },
      })],
    }),
    defineBeat({
      id: 'construct-guided-fork', captionKey: copy.sections.fork, flow: 'compile',
      cues: [
        timedCue('restore-fork-time', 0.8, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-fork-target-clear', {
          waitForSignalsOutOfRange: true, timeout: 20, timelineWait: true,
        }),
        timedCue('fade-fork-target', 0.45, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { signalOpacity: 0 }, ease: 'ease-out',
        }),
        timedCue('dismiss-fork-compact', 0.35, {
          actions: [{ type: 'delete-signals' }], loadoutMode: 'compact-leaving',
        }),
        settleTowerForReset('settle-fork-rotation'),
        timedCue('configure-guided-fork', 0.2, {
          actions: [{ type: 'setup', slots: ['seeker', 'fork', 'pulse'] }], loadoutMode: 'hidden',
        }),
        timedCue('show-fork-before-seeker', 1, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleRange: { start: 1, count: 2 },
        }),
        timedCue('insert-seeker', 2.4, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleRange: { start: 0, count: 3 },
        }),
      ],
    }),
    defineBeat({
      id: 'explain-guided-fork', captionKey: copy.beats.gather, flow: 'compile',
      cues: [explainLoadoutSlot('point-guided-fork', 4.2, copy.beats.gather, 0)],
    }),
    defineBeat({
      id: 'fire-guided-fork', captionKey: copy.beats.focused, flow: 'impact',
      cues: fireCapturedRun('guided-fork', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 92 }, captureAs: 'guidedForkTarget' }],
        capture: { type: 'projectile-hit', moduleId: 'seeker', occurrence: 3 },
        captureTimeout: 12,
        settleDuration: 0.05,
      }),
    }),
    defineBeat({
      id: 'show-guided-focus', captionKey: copy.beats.focused, flow: 'impact',
      cues: [showPause({
        id: 'point-guided-focus', captionKey: copy.beats.focused,
        target: { signalRef: 'guidedForkTarget' }, requireAlive: 'guidedForkTarget',
      })],
    }),
    defineBeat({
      id: 'finish-guided-fork', captionKey: copy.sections.fork, flow: 'observe',
      cues: finishRun('finish-guided-fork', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
