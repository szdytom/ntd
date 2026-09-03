import {
  defineBeat,
  defineModuleThought,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import {
  PARALLEL_COMPARISON_ENTRANCES,
  PARALLEL_COMPARISON_MERGE_NODE,
  parallelComparisonScene,
} from '../thoughts/scenes';
import { overdriveModule } from './overdrive';

const copy = {
  title: 'thoughts.overdrive.title',
  summary: 'thoughts.overdrive.summary',
  section: 'thoughts.overdrive.sections.compare',
  beatEmpower: 'thoughts.overdrive.beats.empower',
  beatHit: 'thoughts.overdrive.beats.hit',
} as const;

const loadoutTargets = [
  { towerIndex: 0, placement: 'bottom-right' },
  { towerIndex: 1, placement: 'bottom-right' },
] as const;

export const overdriveThought = defineModuleThought(overdriveModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 89,
  scene: parallelComparisonScene({ towerSlots: 2, signalHealthScale: 1, signalSpeedScale: 0.65 }),
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
      id: 'construct-comparison', captionKey: copy.section, flow: 'compile',
      cues: [
        timedCue('blank-comparison', 0.5, {
          actions: [{
            type: 'setup-towers',
            loadouts: [
              { towerIndex: 0, slots: ['pulse'] },
              { towerIndex: 1, slots: ['overdrive', 'pulse'] },
            ],
          }],
          loadoutMode: 'hidden',
        }),
        timedCue('draw-comparison-roads', 1.4, {
          transition: { pathProgress: 1 }, ease: 'smooth',
        }),
        timedCue('show-comparison-pads', 0.6, {
          transition: { towerPadOpacities: [1, 1] }, ease: 'ease-out',
        }),
        timedCue('place-baseline-tower', 0.8, {
          transition: { towerPadOpacities: [0, 1], towerOpacities: [1, 0] },
          ease: 'ease-out', placementBurst: true, placementBurstTowerIndex: 0,
        }),
        timedCue('place-overdrive-tower', 0.8, {
          transition: { towerPadOpacities: [0, 0], towerOpacities: [1, 1] },
          ease: 'ease-out', placementBurst: true, placementBurstTowerIndex: 1,
        }),
      ],
    }),
    defineBeat({
      id: 'show-comparison-loadouts', captionKey: copy.section, flow: 'compile',
      cues: [timedCue('show-both-loadouts', 3.2, {
        sectionTitleKey: copy.section,
        overlay: { type: 'loadouts', targets: loadoutTargets },
        loadoutMode: 'dialog', loadoutVisibleSlots: 2,
      })],
    }),
    defineBeat({
      id: 'explain-overdrive', captionKey: copy.beatEmpower, flow: 'compile',
      cues: [timedCue('point-overdrive', 4.2, {
        overlay: { type: 'caption', textKey: copy.beatEmpower, target: { towerIndex: 1, slot: 0 } },
        highlightSlots: [0],
      })],
    }),
    defineBeat({
      id: 'fire-comparison', captionKey: copy.beatHit, flow: 'impact',
      cues: [
        timedCue('dismiss-comparison-loadouts', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-comparison-loadouts', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-comparison-targets', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            {
              type: 'spawn-signal', signal: 'kite', captureAs: 'baselineTarget',
              position: { type: 'route-progress', entrance: PARALLEL_COMPARISON_ENTRANCES.upper, progress: 0 },
            },
            {
              type: 'spawn-signal', signal: 'kite', captureAs: 'overdriveTarget',
              position: { type: 'route-progress', entrance: PARALLEL_COMPARISON_ENTRANCES.lower, progress: 0 },
            },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-comparison-launches', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'pulse', occurrence: 2 },
          timeout: 12, timelineWait: true,
        }),
        waitCue('wait-comparison-hits', {
          waitFor: { type: 'projectile-hit', moduleId: 'pulse', occurrence: 2 },
          timeout: 8, timelineWait: true,
        }),
        timedCue('settle-comparison-hits', 0.5, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-damage-comparison', captionKey: copy.beatHit, flow: 'impact',
      cues: [timedCue('point-overdrive-damage', 4.2, {
        transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beatHit, target: { signalRef: 'overdriveTarget' } },
        requireSignalState: { signalRef: 'overdriveTarget', alive: true },
      })],
    }),
    defineBeat({
      id: 'finish-comparison', captionKey: copy.section, flow: 'observe',
      cues: [
        timedCue('restore-comparison-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-comparison-merge', {
          waitForSignalsPastNode: PARALLEL_COMPARISON_MERGE_NODE,
          timeout: 20, timelineWait: true,
        }),
        timedCue('delete-comparison-signals', 0.1, {
          actions: [{ type: 'set-tower-casting', enabled: false }, { type: 'delete-signals' }],
        }),
        waitCue('wait-comparison-energy', { waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
        timedCue('settle-comparison-towers', 0.5, {
          transition: { towerRotations: [0, 0] }, ease: 'smooth',
        }),
      ],
    }),
  ],
});
