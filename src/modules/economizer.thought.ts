import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  finishRun,
  fireCapturedRun,
  introduceScene,
  openRun,
  settleTowerForReset,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { economizerModule } from './economizer';

const copy = {
  title: 'thoughts.economizer.title',
  summary: 'thoughts.economizer.summary',
  sections: {
    baseline: 'thoughts.economizer.sections.baseline',
    economize: 'thoughts.economizer.sections.economize',
  },
  beats: {
    baseline: 'thoughts.economizer.beats.baseline',
    modify: 'thoughts.economizer.beats.modify',
    energy: 'thoughts.economizer.beats.energy',
    damage: 'thoughts.economizer.beats.damage',
  },
} as const;

const target = {
  signal: 'kite' as const,
  position: { type: 'tower-range-entry' as const, leadDistance: 60 },
};

export const economizerThought = defineModuleThought(economizerModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 191,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-baseline', captionKey: copy.sections.baseline, flow: 'compile',
      cues: introduceScene({ slots: ['prism-slug'] }),
    }),
    defineBeat({
      id: 'show-baseline-loadout', captionKey: copy.sections.baseline, flow: 'compile',
      cues: [timedCue('show-baseline-loadout', 2.4, {
        sectionTitleKey: copy.sections.baseline,
        overlay: { type: 'loadout', target: 'tower', placement: 'right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      })],
    }),
    defineBeat({
      id: 'fire-baseline', captionKey: copy.beats.baseline, flow: 'impact',
      cues: fireCapturedRun('baseline', {
        carrier: 'prism-slug',
        inputs: [{ ...target, captureAs: 'baselineTarget' }],
        capture: { type: 'projectile-hit', moduleId: 'prism-slug' },
      }),
    }),
    defineBeat({
      id: 'show-baseline-result', captionKey: copy.beats.baseline, flow: 'observe',
      cues: [timedCue('point-baseline', 4.2, {
        transitionDuration: 0.6,
        transition: { simulationRate: 0.08 },
        ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.baseline, target: { signalRef: 'baselineTarget' } },
        requireSignalState: { signalRef: 'baselineTarget', alive: true },
      })],
    }),
    defineBeat({
      id: 'configure-economizer', captionKey: copy.sections.economize, flow: 'compile',
      cues: [
        timedCue('restore-baseline-time', 1, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-baseline-target-clear', {
          waitForSignalsOutOfRange: true, timeout: 20, timelineWait: true,
        }),
        timedCue('fade-baseline-target', 0.5, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { signalOpacity: 0 }, ease: 'ease-out',
        }),
        timedCue('dismiss-baseline-compact', 0.35, {
          actions: [{ type: 'delete-signals' }], loadoutMode: 'compact-leaving',
        }),
        settleTowerForReset('settle-baseline-tower'),
        timedCue('configure-economizer-loadout', 0.2, {
          actions: [{ type: 'setup', slots: ['economizer', 'prism-slug'] }],
          loadoutMode: 'hidden',
        }),
        timedCue('show-slug-before-economizer', 1.15, {
          sectionTitleKey: copy.sections.economize,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleRange: { start: 1, count: 1 },
        }),
        timedCue('insert-economizer', 2.5, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleRange: { start: 0, count: 2 },
        }),
      ],
    }),
    defineBeat({
      id: 'explain-economizer', captionKey: copy.beats.modify, flow: 'compile',
      cues: [explainLoadoutSlot('point-economizer', 4.2, copy.beats.modify, 0)],
    }),
    defineBeat({
      id: 'fire-economized', captionKey: copy.beats.energy, flow: 'cast',
      cues: [
        ...openRun('economized'),
        timedCue('economized-spawn', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', ...target, captureAs: 'economizedTarget' },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('economized-launch', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'economizer' },
          timeout: 12,
          timelineWait: true,
        }),
        waitCue('economized-energy-change', {
          waitFor: { type: 'tower-energy-changed' },
          timeout: 2,
          timelineWait: true,
        }),
      ],
    }),
    defineBeat({
      id: 'show-energy-result', captionKey: copy.beats.energy, flow: 'observe',
      cues: [timedCue('point-economized-energy', 4.2, {
        actions: [{ type: 'set-tower-casting', enabled: false }],
        transitionDuration: 0.6,
        transition: { simulationRate: 0.08 },
        ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.energy, target: { towerIndex: 0 } },
      })],
    }),
    defineBeat({
      id: 'show-damage-result', captionKey: copy.beats.damage, flow: 'impact',
      cues: [
        waitCue('wait-economized-hit', {
          waitFor: { type: 'projectile-hit', moduleId: 'economizer' },
          timeout: 8,
          timelineWait: true,
        }),
        timedCue('point-economized-damage', 4.2, {
          overlay: { type: 'caption', textKey: copy.beats.damage, target: { signalRef: 'economizedTarget' } },
          requireSignalState: { signalRef: 'economizedTarget', alive: true },
        }),
      ],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.sections.economize, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
