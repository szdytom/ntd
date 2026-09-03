import type { ModuleDefinition } from '../../modules/types';
import type { ThoughtDefinition } from '../types';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../scenes';
import { defineBeat } from './beats';
import { timedCue, waitCue } from './cues';
import { defineModuleThought } from './define';
import { explainLoadoutSlot, introduceScene } from './recipes';
import {
  finishRun,
  fireCapturedRun,
  resetWithLoadoutReplacement,
  settleTowerForReset,
  showPause,
} from './sequences';

export interface RepeatCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionRepeat: string;
  readonly sectionStack: string;
  readonly sectionFocus: string;
  readonly beatRepeat: string;
  readonly beatVolley: string;
  readonly beatEnergy: string;
  readonly beatStack: string;
  readonly beatMultiplied: string;
  readonly beatFocus: string;
  readonly beatFocusedHit: string;
}

interface RepeatThoughtOptions {
  readonly module: ModuleDefinition;
  readonly copy: RepeatCopy;
  readonly seed: number;
  readonly casts: number;
}

/** Teaches repeat count, multiplicative stacking, cycle energy, and Focus Core conversion. */
export const buildRepeatThought = (options: RepeatThoughtOptions): ThoughtDefinition => {
  const { module, copy, seed, casts } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 4, signalHealthScale: 8, signalSpeedScale: 0.75 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct-repeat', captionKey: copy.sectionRepeat, flow: 'compile',
        cues: introduceScene({ slots: [module.id, 'pulse'] }),
      }),
      defineBeat({
        id: 'show-repeat-loadout', captionKey: copy.sectionRepeat, flow: 'compile',
        cues: [
          timedCue('show-repeat-module', 0.75, {
            sectionTitleKey: copy.sectionRepeat,
            overlay: { type: 'loadout', target: 'tower', placement: 'right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 1,
          }),
          timedCue('show-repeat-carrier', 2.45, {
            overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2,
          }),
        ],
      }),
      defineBeat({
        id: 'explain-repeat', captionKey: copy.beatRepeat, flow: 'compile',
        cues: [explainLoadoutSlot('point-repeat-module', 4.2, copy.beatRepeat, 0)],
      }),
      defineBeat({
        id: 'fire-repeat', captionKey: copy.beatVolley, flow: 'cast',
        cues: fireCapturedRun('repeat', {
          carrier: 'pulse',
          inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 70 }, captureAs: 'repeatTarget' }],
          capture: { type: 'projectile-spawned', moduleId: module.id, occurrence: casts, captureAs: 'repeatedProjectiles' },
          captureTimeout: 12,
          settleDuration: 0.08,
        }),
      }),
      defineBeat({
        id: 'show-repeat-volley', captionKey: copy.beatVolley, flow: 'cast',
        cues: [showPause({
          id: 'point-repeat-volley', captionKey: copy.beatVolley,
          target: { projectileGroupRef: 'repeatedProjectiles' },
        })],
      }),
      defineBeat({
        id: 'show-repeat-energy', captionKey: copy.beatEnergy, flow: 'observe',
        cues: [timedCue('point-repeat-energy', 4.2, {
          overlay: { type: 'caption', textKey: copy.beatEnergy, target: { towerIndex: 0 } },
        })],
      }),
      defineBeat({
        id: 'construct-stack', captionKey: copy.sectionStack, flow: 'compile',
        cues: [
          timedCue('restore-repeat-time', 0.8, {
            actions: [{ type: 'set-tower-casting', enabled: true }],
            transition: { simulationRate: 1 }, ease: 'smooth',
          }),
          waitCue('wait-repeat-target-clear', {
            waitForSignalsOutOfRange: true, timeout: 20, timelineWait: true,
          }),
          timedCue('fade-repeat-target', 0.45, {
            actions: [{ type: 'set-tower-casting', enabled: false }],
            transition: { signalOpacity: 0 }, ease: 'ease-out',
          }),
          timedCue('dismiss-repeat-compact', 0.35, {
            actions: [{ type: 'delete-signals' }], loadoutMode: 'compact-leaving',
          }),
          settleTowerForReset('settle-repeat-rotation'),
          timedCue('configure-stack', 0.2, {
            actions: [{ type: 'setup', slots: [module.id, module.id, 'pulse'] }], loadoutMode: 'hidden',
          }),
          timedCue('show-stack-baseline', 1, {
            sectionTitleKey: copy.sectionStack,
            overlay: { type: 'loadout', target: 'tower', placement: 'right' },
            loadoutMode: 'dialog', loadoutVisibleRange: { start: 1, count: 2 },
          }),
          timedCue('insert-second-repeat', 2.4, {
            overlay: { type: 'loadout', target: 'tower', placement: 'right' },
            loadoutVisibleRange: { start: 0, count: 3 },
          }),
        ],
      }),
      defineBeat({
        id: 'explain-stack', captionKey: copy.beatStack, flow: 'compile',
        cues: [explainLoadoutSlot('point-second-repeat', 4.2, copy.beatStack, 0)],
      }),
      defineBeat({
        id: 'fire-stack', captionKey: copy.beatMultiplied, flow: 'cast',
        cues: fireCapturedRun('stack', {
          carrier: 'pulse',
          inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 82 }, captureAs: 'stackTarget' }],
          capture: { type: 'projectile-spawned', moduleId: module.id, occurrence: casts * casts, captureAs: 'stackedProjectiles' },
          captureTimeout: 16,
          settleDuration: 0.08,
        }),
      }),
      defineBeat({
        id: 'show-multiplied-stack', captionKey: copy.beatMultiplied, flow: 'impact',
        cues: [showPause({
          id: 'point-multiplied-stack', captionKey: copy.beatMultiplied,
          target: { signalRef: 'stackTarget' }, requireAlive: 'stackTarget',
        })],
      }),
      defineBeat({
        id: 'construct-focus', captionKey: copy.sectionFocus, flow: 'focus',
        cues: resetWithLoadoutReplacement(
          'focus',
          ['focus-core', module.id, 'pulse'],
          copy.sectionFocus,
        ),
      }),
      defineBeat({
        id: 'explain-focus', captionKey: copy.beatFocus, flow: 'focus',
        cues: [explainLoadoutSlot('point-focus-core', 4.2, copy.beatFocus, 0)],
      }),
      defineBeat({
        id: 'fire-focused-repeat', captionKey: copy.beatFocusedHit, flow: 'focus',
        cues: fireCapturedRun('focused-repeat', {
          carrier: 'pulse',
          inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 70 }, captureAs: 'focusedTarget' }],
          capture: { type: 'projectile-spawned', moduleId: 'focus-core', captureAs: 'focusedProjectile' },
          settleDuration: 0.08,
        }),
      }),
      defineBeat({
        id: 'show-focused-repeat', captionKey: copy.beatFocusedHit, flow: 'focus',
        cues: [showPause({
          id: 'point-focused-repeat', captionKey: copy.beatFocusedHit,
          target: { projectileRef: 'focusedProjectile' },
        })],
      }),
      defineBeat({
        id: 'finish-focused-repeat', captionKey: copy.sectionFocus, flow: 'observe',
        cues: finishRun('finish-focused-repeat', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
      }),
    ],
  });
};
