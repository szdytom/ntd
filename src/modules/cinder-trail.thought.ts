import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  settleTowerForReset,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import {
  PARALLEL_COMPARISON_MERGE_NODE,
  parallelComparisonScene,
  PARALLEL_COMPARISON_ENTRANCES,
} from '../thoughts/scenes';
import { cinderTrailModule } from './cinder-trail';

const copy = {
  title: 'thoughts.cinderTrail.title',
  summary: 'thoughts.cinderTrail.summary',
  sections: {
    path: 'thoughts.cinderTrail.sections.path',
    carrier: 'thoughts.cinderTrail.sections.carrier',
  },
  beats: {
    settles: 'thoughts.cinderTrail.beats.settles',
    burns: 'thoughts.cinderTrail.beats.burns',
    stops: 'thoughts.cinderTrail.beats.stops',
    extends: 'thoughts.cinderTrail.beats.extends',
  },
} as const;

const comparisonLoadouts = [
  { towerIndex: 0, placement: 'bottom-right' },
  { towerIndex: 1, placement: 'bottom-right' },
] as const;

const comparisonSignals = (
  type: 'kite' | 'spark',
  progresses: readonly number[],
) => progresses.flatMap((progress) => ([
  {
    type: 'spawn-signal' as const,
    signal: type,
    position: {
      type: 'route-progress' as const,
      entrance: PARALLEL_COMPARISON_ENTRANCES.upper,
      progress,
    },
  },
  {
    type: 'spawn-signal' as const,
    signal: type,
    position: {
      type: 'route-progress' as const,
      entrance: PARALLEL_COMPARISON_ENTRANCES.lower,
      progress,
    },
  },
]));

export const cinderTrailThought = defineModuleThought(cinderTrailModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 29,
  scene: parallelComparisonScene({
    towerSlots: 2,
    signalHealthScale: 0.8,
    signalSpeedScale: 0.7,
  }),
  initialScene: {
    pathProgress: 0,
    towerPadOpacity: 0,
    towerOpacity: 1,
    towerPadOpacities: [0, 0],
    towerOpacities: [0, 0],
    signalOpacity: 0,
    simulationRate: 1,
  },
  beats: [
    defineBeat({
      id: 'construct-cinder', captionKey: copy.sections.path, flow: 'compile',
      cues: [
        timedCue('blank-cinder-stage', 0.5, {
          actions: [{ type: 'setup', slots: ['cinder-trail', 'void-beam'] }],
          loadoutMode: 'hidden',
        }),
        timedCue('draw-comparison-roads', 1.4, {
          transition: { pathProgress: 1 }, ease: 'smooth',
        }),
        timedCue('show-comparison-pads', 0.6, {
          transition: { towerPadOpacities: [1, 1] }, ease: 'ease-out',
        }),
        timedCue('place-upper-tower', 0.9, {
          transition: { towerPadOpacities: [0, 1], towerOpacities: [1, 0] },
          ease: 'ease-out', placementBurst: true, placementBurstTowerIndex: 0,
        }),
      ],
    }),
    defineBeat({
      id: 'show-cinder-loadout', captionKey: copy.sections.path, flow: 'compile',
      cues: [
        timedCue('show-cinder-module', 0.65, {
          sectionTitleKey: copy.sections.path,
          overlay: { type: 'loadout', target: { towerIndex: 0 }, placement: 'bottom-right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        }),
        timedCue('show-cinder-carrier', 2.2, {
          overlay: { type: 'loadout', target: { towerIndex: 0 }, placement: 'bottom-right' },
          loadoutVisibleSlots: 2,
        }),
      ],
    }),
    defineBeat({
      id: 'explain-cinder-settlement', captionKey: copy.beats.settles, flow: 'trail',
      cues: [explainLoadoutSlot('point-cinder-module', 4.2, copy.beats.settles, 0)],
    }),
    defineBeat({
      id: 'burn-basic-signal', captionKey: copy.beats.burns, flow: 'trail',
      cues: [
        timedCue('dismiss-cinder-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-cinder-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-basic-cinder-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            {
              type: 'spawn-signal', signal: 'kite', captureAs: 'basicCinderTarget',
              position: {
                type: 'route-progress',
                entrance: PARALLEL_COMPARISON_ENTRANCES.upper,
                progress: 0,
              },
            },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-basic-cinder-carrier', {
          actions: [{ type: 'set-tower-casting', enabled: true, towerIndex: 0 }],
          waitFor: { type: 'projectile-spawned', moduleId: 'void-beam', captureAs: 'basicCinderCarrier' },
          timeout: 10, timelineWait: true,
        }),
        waitCue('wait-basic-cinder-burn', {
          waitFor: { type: 'status-applied', moduleId: 'cinder-trail', captureAs: 'basicCinderBurn' },
          timeout: 8, timelineWait: true,
        }),
        timedCue('settle-basic-cinder-burn', 0.5, {
          actions: [{ type: 'set-tower-casting', enabled: false, towerIndex: 0 }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-basic-cinder-burn', captionKey: copy.beats.burns, flow: 'trail',
      cues: [
        timedCue('point-basic-cinder-burn', 4.2, {
          transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beats.burns, target: { signalRef: 'basicCinderBurn' } },
          requireSignalState: { signalRef: 'basicCinderBurn', alive: true },
        }),
        timedCue('resume-basic-cinder-burn', 0.8, {
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-basic-cinder-defeat', {
          waitFor: { type: 'signal-defeated' }, timeout: 10, timelineWait: true,
        }),
        timedCue('settle-basic-cinder-defeat', 0.5),
      ],
    }),
    defineBeat({
      id: 'construct-carrier-comparison', captionKey: copy.sections.carrier, flow: 'compile',
      cues: [
        timedCue('clear-basic-cinder-signal', 0.45, {
          transition: { signalOpacity: 0 }, ease: 'smooth',
        }),
        timedCue('dismiss-basic-cinder-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        settleTowerForReset('settle-basic-cinder-rotation'),
        timedCue('configure-first-comparison', 0.2, {
          actions: [{
            type: 'setup-towers',
            loadouts: [
              { towerIndex: 0, slots: ['cinder-trail', 'pulse'] },
              { towerIndex: 1, slots: ['cinder-trail', 'void-beam'] },
            ],
          }],
          loadoutMode: 'hidden',
        }),
        timedCue('place-lower-tower', 0.9, {
          sectionTitleKey: copy.sections.carrier,
          transition: { towerPadOpacities: [0, 0], towerOpacities: [1, 1] },
          ease: 'ease-out', placementBurst: true, placementBurstTowerIndex: 1,
        }),
      ],
    }),
    defineBeat({
      id: 'show-first-comparison', captionKey: copy.sections.carrier, flow: 'compile',
      cues: [
        timedCue('show-first-comparison-trails', 0.75, {
          overlay: { type: 'loadouts', targets: comparisonLoadouts },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        }),
        timedCue('show-first-comparison-carriers', 2.45, {
          overlay: { type: 'loadouts', targets: comparisonLoadouts },
          loadoutVisibleSlots: 2,
        }),
      ],
    }),
    defineBeat({
      id: 'run-first-comparison', captionKey: copy.sections.carrier, flow: 'trail',
      cues: [
        timedCue('dismiss-first-comparison', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-first-comparison', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-first-comparison-targets', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            ...comparisonSignals('kite', [0]),
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-comparison-pulse', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'pulse', captureAs: 'comparisonPulse' },
          timeout: 10, timelineWait: true,
        }),
        waitCue('capture-comparison-void', {
          waitFor: { type: 'projectile-spawned', moduleId: 'void-beam', captureAs: 'comparisonVoid' },
          timeout: 2, timelineWait: true,
        }),
        waitCue('wait-comparison-pulse-hit', {
          waitFor: { type: 'projectile-hit', moduleId: 'pulse' },
          timeout: 5, timelineWait: true,
        }),
        waitCue('wait-comparison-void-extension', {
          waitForProjectileStates: [{ projectileRef: 'comparisonVoid', alive: true, minimumTravelDistance: 245 }],
          timeout: 4, timelineWait: true,
        }),
        timedCue('observe-first-comparison', 0.45),
      ],
    }),
    defineBeat({
      id: 'replace-comparison-carriers', captionKey: copy.sections.carrier, flow: 'compile',
      cues: [
        waitCue('wait-first-comparison-merge', {
          waitForSignalsPastNode: PARALLEL_COMPARISON_MERGE_NODE,
          timeout: 20,
          timelineWait: true,
        }),
        timedCue('fade-first-comparison', 0.45, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { signalOpacity: 0 }, ease: 'ease-out',
        }),
        timedCue('dismiss-first-comparison-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('show-before-second-comparison', 1, {
          overlay: { type: 'loadouts', targets: comparisonLoadouts },
          loadoutMode: 'dialog', loadoutVisibleSlots: 2,
        }),
        settleTowerForReset('settle-first-comparison-rotation'),
        timedCue('replace-comparison-carriers', 2.4, {
          actions: [{
            type: 'setup-towers',
            loadouts: [
              { towerIndex: 0, slots: ['cinder-trail', 'nova'] },
              { towerIndex: 1, slots: ['cinder-trail', 'razor'] },
            ],
          }],
          animateLoadoutChanges: true,
          overlay: { type: 'loadouts', targets: comparisonLoadouts },
        }),
      ],
    }),
    defineBeat({
      id: 'run-second-comparison', captionKey: copy.sections.carrier, flow: 'trail',
      cues: [
        timedCue('dismiss-second-comparison', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-second-comparison', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-second-comparison-targets', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            ...comparisonSignals('spark', [0, 0.05, 0.1]),
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('capture-comparison-nova', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'nova', captureAs: 'comparisonNova' },
          timeout: 10, timelineWait: true,
        }),
        waitCue('capture-comparison-razor', {
          waitFor: { type: 'projectile-spawned', moduleId: 'razor', captureAs: 'comparisonRazor' },
          timeout: 2, timelineWait: true,
        }),
        waitCue('wait-comparison-nova-hit', {
          waitFor: { type: 'projectile-hit', moduleId: 'nova' },
          timeout: 5, timelineWait: true,
        }),
        waitCue('wait-comparison-razor-hits', {
          waitFor: { type: 'projectile-hit', moduleId: 'razor', occurrence: 3 },
          timeout: 5, timelineWait: true,
        }),
        timedCue('settle-second-comparison', 0.3, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'explain-carrier-ending', captionKey: copy.beats.stops, flow: 'observe',
      cues: [timedCue('point-nova-trail-end', 4.2, {
        transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.stops, target: { trailRef: 'comparisonNova', anchor: 'end' } },
      })],
    }),
    defineBeat({
      id: 'explain-carrier-extension', captionKey: copy.beats.extends, flow: 'observe',
      cues: [timedCue('point-razor-trail-end', 4.2, {
        overlay: { type: 'caption', textKey: copy.beats.extends, target: { trailRef: 'comparisonRazor', anchor: 'end' } },
      })],
    }),
    defineBeat({
      id: 'finish-cinder-comparison', captionKey: copy.sections.carrier, flow: 'observe',
      cues: [
        timedCue('restore-cinder-comparison', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-cinder-comparison-merge', {
          waitForSignalsPastNode: PARALLEL_COMPARISON_MERGE_NODE,
          timeout: 20,
          timelineWait: true,
        }),
        timedCue('delete-cinder-comparison-signals', 0.1, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'delete-signals' },
          ],
        }),
        waitCue('wait-cinder-comparison-energy', {
          waitForTowerEnergy: true, timeout: 20, timelineWait: true,
        }),
        timedCue('settle-cinder-comparison', 0.5, {
          transition: { towerRotations: [0, 0], towerEnergyRatio: 1 }, ease: 'smooth',
        }),
      ],
    }),
  ],
});
