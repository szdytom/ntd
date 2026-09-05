import type { ModuleId } from '@prism-bastion/game-core/game/types';
import type { ModuleDefinition } from '@prism-bastion/game-core/modules/types';
import type { ThoughtDefinition, ThoughtEventMatcher, ThoughtOverlayTarget } from '../types';
import {
  PARALLEL_COMPARISON_ENTRANCES,
  PARALLEL_COMPARISON_MERGE_NODE,
  parallelComparisonScene,
} from '../scenes';
import { defineBeat } from './beats';
import { timedCue, waitCue } from './cues';
import { defineModuleThought } from './define';
import { explainLoadoutSlot } from './recipes';
import { settleTowerForReset } from './sequences';

export interface TrailWakeCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionWake: string;
  readonly sectionCarrier: string;
  readonly beatSettle: string;
  readonly beatAffect: string;
  readonly beatStops: string;
  readonly beatExtends: string;
}

interface TrailWakeOptions {
  readonly module: ModuleDefinition;
  readonly copy: TrailWakeCopy;
  readonly seed: number;
  readonly wake: ThoughtEventMatcher;
  readonly wakeTarget: ThoughtOverlayTarget;
  readonly wakeRef?: string;
  readonly signalHealthScale?: number;
  readonly signalSpeedScale?: number;
  readonly comparisonTargets?: {
    readonly stops: ThoughtOverlayTarget;
    readonly extends: ThoughtOverlayTarget;
  };
}

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

/** Teaches a trail's local effect, then how carrier path and lifetime shape its coverage. */
export const buildTrailWakeThought = (options: TrailWakeOptions): ThoughtDefinition => {
  const {
    module, copy, seed, wake, wakeTarget, wakeRef,
    signalHealthScale = 1.2, signalSpeedScale = 0.7,
    comparisonTargets = {
      stops: { trailRef: 'comparisonNova', anchor: 'end' },
      extends: { trailRef: 'comparisonRazor', anchor: 'end' },
    },
  } = options;
  const trailLoadout = (carrier: ModuleId) => [module.id, carrier] as const;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: parallelComparisonScene({ towerSlots: 2, signalHealthScale, signalSpeedScale }),
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
        id: 'construct-wake', captionKey: copy.sectionWake, flow: 'compile',
        cues: [
          timedCue('blank-wake-stage', 0.5, {
            actions: [{ type: 'setup', slots: trailLoadout('void-beam') }], loadoutMode: 'hidden',
          }),
          timedCue('draw-wake-roads', 1.4, { transition: { pathProgress: 1 }, ease: 'smooth' }),
          timedCue('show-wake-pads', 0.6, { transition: { towerPadOpacities: [1, 1] }, ease: 'ease-out' }),
          timedCue('place-wake-tower', 0.9, {
            transition: { towerPadOpacities: [0, 1], towerOpacities: [1, 0] },
            ease: 'ease-out', placementBurst: true, placementBurstTowerIndex: 0,
          }),
        ],
      }),
      defineBeat({
        id: 'show-wake-loadout', captionKey: copy.sectionWake, flow: 'compile',
        cues: [
          timedCue('show-wake-module', 0.65, {
            sectionTitleKey: copy.sectionWake,
            overlay: { type: 'loadout', target: { towerIndex: 0 }, placement: 'bottom-right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 1,
          }),
          timedCue('show-wake-carrier', 2.2, {
            overlay: { type: 'loadout', target: { towerIndex: 0 }, placement: 'bottom-right' },
            loadoutVisibleSlots: 2,
          }),
        ],
      }),
      defineBeat({
        id: 'explain-wake', captionKey: copy.beatSettle, flow: 'trail',
        cues: [explainLoadoutSlot('point-wake-module', 4.2, copy.beatSettle, 0)],
      }),
      defineBeat({
        id: 'run-basic-wake', captionKey: copy.beatAffect, flow: 'trail',
        cues: [
          timedCue('dismiss-wake-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
          timedCue('compact-wake-loadout', 0.35, { loadoutMode: 'compact' }),
          timedCue('spawn-basic-wake-target', 0.7, {
            actions: [
              { type: 'set-tower-casting', enabled: false },
              {
                type: 'spawn-signal', signal: 'kite', captureAs: 'basicWakeTarget',
                position: { type: 'route-progress', entrance: PARALLEL_COMPARISON_ENTRANCES.upper, progress: 0 },
              },
            ],
            transition: { signalOpacity: 1 }, ease: 'ease-out',
          }),
          waitCue('wait-basic-wake-carrier', {
            actions: [{ type: 'set-tower-casting', enabled: true, towerIndex: 0 }],
            waitFor: { type: 'projectile-spawned', moduleId: 'void-beam', captureAs: 'basicWakeCarrier' },
            timeout: 10, timelineWait: true,
          }),
          waitCue('wait-basic-wake-effect', { waitFor: wake, timeout: 10, timelineWait: true }),
          timedCue('settle-basic-wake-effect', 0.5, {
            actions: [{ type: 'set-tower-casting', enabled: false, towerIndex: 0 }],
          }),
        ],
      }),
      defineBeat({
        id: 'show-basic-wake', captionKey: copy.beatAffect, flow: 'trail',
        cues: [timedCue('point-basic-wake', 4.2, {
          transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beatAffect, target: wakeTarget },
          ...(wakeRef ? { requireSignalState: { signalRef: wakeRef, alive: true } } : {}),
        })],
      }),
      defineBeat({
        id: 'construct-carrier-comparison', captionKey: copy.sectionCarrier, flow: 'compile',
        cues: [
          timedCue('restore-basic-wake', 0.8, {
            actions: [{ type: 'set-tower-casting', enabled: true }],
            transition: { simulationRate: 1 }, ease: 'smooth',
          }),
          waitCue('wait-basic-wake-clear', {
            waitForSignalsPastNode: PARALLEL_COMPARISON_MERGE_NODE, timeout: 20, timelineWait: true,
          }),
          timedCue('clear-basic-wake', 0.45, {
            actions: [{ type: 'set-tower-casting', enabled: false }],
            transition: { signalOpacity: 0 }, ease: 'ease-out',
          }),
          timedCue('dismiss-basic-wake-compact', 0.35, {
            actions: [{ type: 'delete-signals' }], loadoutMode: 'compact-leaving',
          }),
          settleTowerForReset('settle-basic-wake-rotation'),
          timedCue('configure-first-comparison', 0.2, {
            actions: [{
              type: 'setup-towers',
              loadouts: [
                { towerIndex: 0, slots: trailLoadout('pulse') },
                { towerIndex: 1, slots: trailLoadout('void-beam') },
              ],
            }],
            loadoutMode: 'hidden',
          }),
          timedCue('place-second-wake-tower', 0.9, {
            sectionTitleKey: copy.sectionCarrier,
            transition: { towerPadOpacities: [0, 0], towerOpacities: [1, 1] },
            ease: 'ease-out', placementBurst: true, placementBurstTowerIndex: 1,
          }),
        ],
      }),
      defineBeat({
        id: 'show-first-comparison', captionKey: copy.sectionCarrier, flow: 'compile',
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
        id: 'run-first-comparison', captionKey: copy.sectionCarrier, flow: 'trail',
        cues: [
          timedCue('dismiss-first-comparison', 0.45, { loadoutMode: 'dialog-leaving' }),
          timedCue('compact-first-comparison', 0.35, { loadoutMode: 'compact' }),
          timedCue('spawn-first-comparison-targets', 0.7, {
            actions: [{ type: 'set-tower-casting', enabled: false }, ...comparisonSignals('kite', [0])],
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
            waitFor: { type: 'projectile-hit', moduleId: 'pulse' }, timeout: 5, timelineWait: true,
          }),
          waitCue('wait-comparison-void-extension', {
            waitForProjectileStates: [{ projectileRef: 'comparisonVoid', alive: true, minimumTravelDistance: 245 }],
            timeout: 4, timelineWait: true,
          }),
          timedCue('observe-first-comparison', 0.45),
        ],
      }),
      defineBeat({
        id: 'replace-comparison-carriers', captionKey: copy.sectionCarrier, flow: 'compile',
        cues: [
          waitCue('wait-first-comparison-clear', {
            waitForSignalsPastNode: PARALLEL_COMPARISON_MERGE_NODE, timeout: 20, timelineWait: true,
          }),
          timedCue('fade-first-comparison', 0.45, {
            actions: [{ type: 'set-tower-casting', enabled: false }],
            transition: { signalOpacity: 0 }, ease: 'ease-out',
          }),
          timedCue('dismiss-first-comparison-compact', 0.35, {
            actions: [{ type: 'delete-signals' }], loadoutMode: 'compact-leaving',
          }),
          timedCue('show-before-second-comparison', 1, {
            overlay: { type: 'loadouts', targets: comparisonLoadouts },
            loadoutMode: 'dialog', loadoutVisibleSlots: 2,
          }),
          settleTowerForReset('settle-first-comparison-rotation'),
          timedCue('replace-comparison-carriers', 2.4, {
            actions: [{
              type: 'setup-towers',
              loadouts: [
                { towerIndex: 0, slots: trailLoadout('nova') },
                { towerIndex: 1, slots: trailLoadout('razor') },
              ],
            }],
            animateLoadoutChanges: true,
            overlay: { type: 'loadouts', targets: comparisonLoadouts },
          }),
        ],
      }),
      defineBeat({
        id: 'run-second-comparison', captionKey: copy.sectionCarrier, flow: 'trail',
        cues: [
          timedCue('dismiss-second-comparison', 0.45, { loadoutMode: 'dialog-leaving' }),
          timedCue('compact-second-comparison', 0.35, { loadoutMode: 'compact' }),
          timedCue('spawn-second-comparison-targets', 0.7, {
            actions: [{ type: 'set-tower-casting', enabled: false }, ...comparisonSignals('spark', [0, 0.05, 0.1])],
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
            waitFor: { type: 'projectile-hit', moduleId: 'nova', captureAs: 'comparisonNovaHit' },
            timeout: 5, timelineWait: true,
          }),
          waitCue('wait-comparison-razor-hits', {
            waitFor: { type: 'projectile-hit', moduleId: 'razor', occurrence: 3, captureAs: 'comparisonRazorHit' },
            timeout: 5, timelineWait: true,
          }),
          timedCue('settle-second-comparison', 0.3, {
            actions: [{ type: 'set-tower-casting', enabled: false }],
          }),
        ],
      }),
      defineBeat({
        id: 'explain-carrier-ending', captionKey: copy.beatStops, flow: 'observe',
        cues: [timedCue('point-short-wake', 4.2, {
          transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beatStops, target: comparisonTargets.stops },
        })],
      }),
      defineBeat({
        id: 'explain-carrier-extension', captionKey: copy.beatExtends, flow: 'observe',
        cues: [timedCue('point-long-wake', 4.2, {
          overlay: { type: 'caption', textKey: copy.beatExtends, target: comparisonTargets.extends },
        })],
      }),
      defineBeat({
        id: 'finish-wake-comparison', captionKey: copy.sectionCarrier, flow: 'observe',
        cues: [
          timedCue('restore-wake-comparison', 1.35, {
            actions: [{ type: 'set-tower-casting', enabled: true }],
            transition: { simulationRate: 1 }, ease: 'smooth',
          }),
          waitCue('wait-wake-comparison-merge', {
            waitForSignalsPastNode: PARALLEL_COMPARISON_MERGE_NODE, timeout: 20, timelineWait: true,
          }),
          timedCue('delete-wake-comparison-signals', 0.1, {
            actions: [{ type: 'set-tower-casting', enabled: false }, { type: 'delete-signals' }],
          }),
          waitCue('wait-wake-comparison-energy', { waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
          timedCue('settle-wake-comparison', 0.5, {
            transition: { towerRotations: [0, 0], towerEnergyRatio: 1 }, ease: 'smooth',
          }),
        ],
      }),
    ],
  });
};
