import type { ModuleDefinition } from '../../modules/types';
import type { ThoughtDefinition } from '../types';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../scenes';
import { defineBeat } from './beats';
import { timedCue } from './cues';
import { defineModuleThought } from './define';
import { explainLoadoutSlot, introduceScene } from './recipes';
import type { SignalSpawn } from './sequences';
import { finishRun, fireCapturedRun, showPause } from './sequences';

export interface SplitProjectileCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionSplit: string;
  readonly sectionFocus: string;
  readonly beatSplit: string;
  readonly beatLand: string;
  readonly beatFocus: string;
  readonly beatFocusedHit: string;
}

interface SplitProjectileThoughtOptions {
  readonly module: ModuleDefinition;
  readonly copy: SplitProjectileCopy;
  readonly seed: number;
  readonly count: 2 | 3;
}

const splitTargets = (count: 2 | 3): readonly SignalSpawn[] => [
  { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 90 }, captureAs: 'splitFirst' },
  { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 60 }, captureAs: 'splitSecond' },
  ...(count === 3 ? [{ signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 30 }, captureAs: 'splitThird' }] : []),
];

const focusedTargets = (count: 2 | 3): readonly SignalSpawn[] => [
  { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 90 }, captureAs: 'focusedNeighbor' },
  { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 60 } },
  ...(count === 3 ? [{ signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 30 } }] : []),
];

/** Teaches projectile multiplication, then the Focus Core conversion boundary. */
export const buildSplitProjectileThought = (
  options: SplitProjectileThoughtOptions,
): ThoughtDefinition => {
  const { module, copy, seed, count } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 3, signalSpeedScale: 0.85 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct-split', captionKey: copy.sectionSplit, flow: 'compile',
        cues: introduceScene({ slots: [module.id, 'pulse'] }),
      }),
      defineBeat({
        id: 'show-split-loadout', captionKey: copy.sectionSplit, flow: 'compile',
        cues: [
          timedCue('show-split-module', 0.75, {
            sectionTitleKey: copy.sectionSplit,
            overlay: { type: 'loadout', target: 'tower', placement: 'right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 1,
          }),
          timedCue('show-split-carrier', 2.45, {
            overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2,
          }),
        ],
      }),
      defineBeat({
        id: 'explain-split', captionKey: copy.beatSplit, flow: 'compile',
        cues: [explainLoadoutSlot('point-split-module', 4.2, copy.beatSplit, 0)],
      }),
      defineBeat({
        id: 'fire-split', captionKey: copy.beatLand, flow: 'impact',
        cues: fireCapturedRun('split', {
          carrier: 'pulse',
          inputs: splitTargets(count),
          capture: { type: 'projectile-hit', moduleId: 'pulse', occurrence: count },
        }),
      }),
      defineBeat({
        id: 'show-split-hits', captionKey: copy.beatLand, flow: 'impact',
        cues: [showPause({ id: 'point-split-hits', captionKey: copy.beatLand, target: { signalRef: 'splitFirst' }, requireAlive: 'splitFirst' })],
      }),
      defineBeat({
        id: 'construct-focus', captionKey: copy.sectionFocus, flow: 'focus',
        cues: [
          timedCue('restore-split-time', 1.35, {
            actions: [{ type: 'set-tower-casting', enabled: true }],
            transition: { simulationRate: 1 }, ease: 'smooth',
          }),
          timedCue('fade-split-targets', 0.5, { transition: { signalOpacity: 0 }, ease: 'ease-out' }),
          timedCue('dismiss-split-compact', 0.35, { loadoutMode: 'compact-leaving' }),
          timedCue('configure-focus', 0.2, {
            actions: [{ type: 'setup', slots: ['focus-core', module.id, 'pulse'] }],
            loadoutMode: 'hidden',
          }),
          timedCue('show-split-before-focus', 1.15, {
            sectionTitleKey: copy.sectionFocus,
            overlay: { type: 'loadout', target: 'tower', placement: 'right' },
            loadoutMode: 'dialog', loadoutVisibleRange: { start: 1, count: 2 },
          }),
          timedCue('insert-focus-core', 2.5, {
            overlay: { type: 'loadout', target: 'tower', placement: 'right' },
            loadoutVisibleRange: { start: 0, count: 3 },
          }),
        ],
      }),
      defineBeat({
        id: 'explain-focus', captionKey: copy.beatFocus, flow: 'focus',
        cues: [explainLoadoutSlot('point-focused-split', 4.2, copy.beatFocus, 1)],
      }),
      defineBeat({
        id: 'fire-focused-shot', captionKey: copy.beatFocusedHit, flow: 'focus',
        cues: fireCapturedRun('focused-shot', {
          carrier: 'pulse',
          inputs: focusedTargets(count),
          capture: { type: 'projectile-hit', moduleId: 'pulse' },
        }),
      }),
      defineBeat({
        id: 'show-focused-hit', captionKey: copy.beatFocusedHit, flow: 'focus',
        cues: [showPause({ id: 'point-focused-neighbor', captionKey: copy.beatFocusedHit, target: { signalRef: 'focusedNeighbor' }, requireAlive: 'focusedNeighbor' })],
      }),
      defineBeat({
        id: 'finish-focus', captionKey: copy.sectionFocus, flow: 'observe',
        cues: finishRun('finish-focus', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
      }),
    ],
  });
};
