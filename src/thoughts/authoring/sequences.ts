import type { ModuleId, SignalId } from '../../game/types';
import type { ScenarioSignalPosition } from '../../game/combat-runtime';
import type {
  ThoughtAction,
  ThoughtCue,
  ThoughtEventMatcher,
  ThoughtLoadoutPlacement,
  ThoughtOverlayTarget,
} from '../types';
import { timedCue, waitCue } from './cues';

export interface SignalSpawn {
  readonly signal: SignalId;
  readonly position: ScenarioSignalPosition;
  readonly captureAs?: string;
}

/** Fade the reveal dialog out and collapse the loadout into a compact chip. */
export const openRun = (prefix: string): readonly ThoughtCue[] => [
  timedCue(`${prefix}-dismiss`, 0.45, { loadoutMode: 'dialog-leaving' }),
  timedCue(`${prefix}-compact`, 0.35, { loadoutMode: 'compact' }),
];

export interface FireCaptureOptions {
  readonly carrier: ModuleId;
  readonly inputs: readonly SignalSpawn[];
  readonly capture?: ThoughtEventMatcher;
  readonly captureAs?: string;
  readonly preActions?: readonly ThoughtAction[];
  readonly launchTimeout?: number;
  readonly captureTimeout?: number;
  readonly settleDuration?: number;
  readonly settleActions?: readonly ThoughtAction[];
}

/**
 * Fade in authored targets, arm the tower, wait for the carrier to launch and
 * then for the authored combat event that proves the rule, and finally hold
 * the tower so the proof can be explained without extra shots.
 */
export const fireCapturedRun = (prefix: string, options: FireCaptureOptions): readonly ThoughtCue[] => [
  ...openRun(prefix),
  timedCue(`${prefix}-spawn`, 0.7, {
    actions: [
      { type: 'set-tower-casting', enabled: false },
      ...options.inputs.map((input) => ({
        type: 'spawn-signal' as const,
        signal: input.signal,
        position: input.position,
        ...(input.captureAs ? { captureAs: input.captureAs } : {}),
      })),
      ...(options.preActions ?? []),
    ],
    transition: { signalOpacity: 1 },
    ease: 'ease-out',
  }),
  waitCue(`${prefix}-launch`, {
    actions: [{ type: 'set-tower-casting', enabled: true }],
    waitFor: { type: 'projectile-spawned', moduleId: options.carrier, ...(options.captureAs ? { captureAs: options.captureAs } : {}) },
    timeout: options.launchTimeout ?? 12,
    timelineWait: true,
  }),
  ...(options.capture
    ? [waitCue(`${prefix}-capture`, {
      waitFor: options.capture,
      timeout: options.captureTimeout ?? 8,
      timelineWait: true,
    })]
    : []),
  timedCue(`${prefix}-settle`, options.settleDuration ?? 0.5, {
    actions: [{ type: 'set-tower-casting', enabled: false }, ...(options.settleActions ?? []) ],
    ...(options.settleDuration === undefined ? {} : {}),
  }),
];

export interface ShowPauseOptions {
  readonly id: string;
  readonly captionKey: string;
  readonly target: ThoughtOverlayTarget;
  readonly requireAlive?: string;
  readonly pauseDuration?: number;
  readonly captionDuration?: number;
}

/** Pause the scene and point a caption at the captured proof. */
export const showPause = (options: ShowPauseOptions): ThoughtCue => timedCue(options.id, options.captionDuration ?? 4.2, {
  transitionDuration: 0.8,
  transition: { simulationRate: 0 },
  ease: 'smooth',
  overlay: { type: 'caption', textKey: options.captionKey, target: options.target },
  ...(options.requireAlive ? { requireSignalState: { signalRef: options.requireAlive, alive: true } } : {}),
});

/** Fade the scene, re-arm the tower, and prepare a new loadout under a fresh title. */
export const resetTo = (
  prefix: string,
  nextSlots: readonly ModuleId[],
  sectionTitleKey: string,
  revealSlots: number,
  placement: ThoughtLoadoutPlacement = 'right',
): readonly ThoughtCue[] => [
  timedCue(`${prefix}-restore`, 1.35, {
    actions: [{ type: 'set-tower-casting', enabled: true }],
    transition: { simulationRate: 1 },
    ease: 'smooth',
  }),
  timedCue(`${prefix}-fade`, 0.5, { transition: { signalOpacity: 0 }, ease: 'ease-out' }),
  timedCue(`${prefix}-compact-leave`, 0.35, { loadoutMode: 'compact-leaving' }),
  timedCue(`${prefix}-configure`, 0.2, {
    actions: [{ type: 'setup', slots: nextSlots }],
    loadoutMode: 'hidden',
    transition: { signalOpacity: 0 },
  }),
  timedCue(`${prefix}-title`, 0.75, {
    sectionTitleKey,
    overlay: { type: 'loadout', target: 'tower', placement },
    loadoutMode: 'dialog',
    loadoutVisibleSlots: revealSlots,
  }),
];

/**
 * Let the final scene resolve and ease the tower back to its resting angle.
 * The tower resumes firing, then the director waits for every signal to die
 * or walk past the authored cleanup node (leaving the tower's range), removes
 * them, waits for the tower energy to refill, and finally eases the tower to
 * its resting angle. No lingering signal or fresh shot is frozen on the last
 * frame, and signals are not faded away before they resolve.
 */
export const finishRun = (
  prefix: string,
  rotation: number,
  cleanupNode: string,
): readonly ThoughtCue[] => [
  timedCue(`${prefix}-restore`, 1.35, {
    actions: [{ type: 'set-tower-casting', enabled: true }],
    transition: { simulationRate: 1 },
    ease: 'smooth',
  }),
  waitCue(`${prefix}-clear`, {
    waitForSignalsPastNode: cleanupNode,
    timeout: 20,
    timelineWait: true,
  }),
  timedCue(`${prefix}-delete`, 0.2, {
    actions: [
      { type: 'set-tower-casting', enabled: false },
      { type: 'delete-signals' },
    ],
  }),
  waitCue(`${prefix}-energy`, {
    waitForTowerEnergy: true,
    timeout: 20,
    timelineWait: true,
  }),
  timedCue(`${prefix}-settle`, 0.5, { transition: { towerRotation: rotation }, ease: 'smooth' }),
];
