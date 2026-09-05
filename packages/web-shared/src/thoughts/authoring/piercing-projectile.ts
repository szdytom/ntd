import type { ModuleDefinition } from '@prism-bastion/game-core/modules/types';
import type { ThoughtDefinition } from '../types';
import { STRAIGHT_LANE_CLEANUP, straightFiringLaneScene } from '../scenes';
import { defineBeat } from './beats';
import { timedCue } from './cues';
import { defineModuleThought } from './define';
import { explainLoadoutSlot, introduceScene } from './recipes';
import { finishRun, fireCapturedRun, resetTo, resetWithLoadoutReplacement, showPause } from './sequences';

export interface PiercingProjectileCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionLine: string;
  readonly sectionGuide: string;
  readonly sectionTrail: string;
  readonly sectionFocus: string;
  readonly beatLine: string;
  readonly beatGuide: string;
  readonly beatGuidedHits: string;
  readonly beatTrail: string;
  readonly beatTrailExtent: string;
  readonly beatFocus: string;
  readonly beatFocusedHit: string;
}

interface PiercingProjectileThoughtOptions {
  readonly module: ModuleDefinition;
  readonly copy: PiercingProjectileCopy;
  readonly seed: number;
  readonly hitOccurrence: number;
}

const lineTargets = [
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0 }, captureAs: 'lineFirst' },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.03 }, captureAs: 'lineSecond' },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.06 }, captureAs: 'lineLast' },
];

const guidedTargets = [
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0 }, captureAs: 'guidedFirst' },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.055 } },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.11 }, captureAs: 'guidedLast' },
];

const trailTargets = [
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0 } },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.04 } },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.08 } },
];

const focusTargets = [
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0 } },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.04 }, captureAs: 'focusSecond' },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.08 } },
];

/** Teaches a penetrating carrier on an axial lane, then guidance and trail interactions. */
export const buildPiercingProjectileThought = (
  options: PiercingProjectileThoughtOptions,
): ThoughtDefinition => {
  const { module, copy, seed, hitOccurrence } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightFiringLaneScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.55 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct-line', captionKey: copy.sectionLine, flow: 'compile',
        cues: introduceScene({ slots: [module.id] }),
      }),
      defineBeat({
        id: 'show-line-loadout', captionKey: copy.sectionLine, flow: 'compile',
        cues: [timedCue('show-projectile', 3.2, {
          sectionTitleKey: copy.sectionLine,
          overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        })],
      }),
      defineBeat({
        id: 'fire-line', captionKey: copy.beatLine, flow: 'impact',
        cues: fireCapturedRun('line', {
          carrier: module.id,
          inputs: lineTargets,
          capture: { type: 'projectile-hit', moduleId: module.id, occurrence: hitOccurrence, captureAs: 'lineHit' },
        }),
      }),
      defineBeat({
        id: 'show-line', captionKey: copy.beatLine, flow: 'impact',
        cues: [showPause({ id: 'point-line', captionKey: copy.beatLine, target: { signalRef: 'lineLast' }, requireAlive: 'lineLast' })],
      }),
      defineBeat({
        id: 'construct-guide', captionKey: copy.sectionGuide, flow: 'compile',
        cues: resetTo(
          'guide',
          ['seeker', module.id],
          copy.sectionGuide,
          1,
          'top-right',
          { start: 1, count: 1 },
        ),
      }),
      defineBeat({
        id: 'show-guide-loadout', captionKey: copy.beatGuide, flow: 'compile',
        cues: [
          timedCue('show-guided-projectile', 2.45, {
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 2,
          }),
          explainLoadoutSlot('point-guided-projectile', 4.2, copy.beatGuide, 1),
        ],
      }),
      defineBeat({
        id: 'fire-guided-line', captionKey: copy.beatGuidedHits, flow: 'impact',
        cues: fireCapturedRun('guided-line', {
          carrier: module.id,
          inputs: guidedTargets,
          capture: { type: 'projectile-hit', moduleId: module.id, occurrence: hitOccurrence, captureAs: 'guidedHit' },
        }),
      }),
      defineBeat({
        id: 'show-guided-line', captionKey: copy.beatGuidedHits, flow: 'impact',
        cues: [showPause({ id: 'point-guided-line', captionKey: copy.beatGuidedHits, target: { signalRef: 'guidedFirst' }, requireAlive: 'guidedFirst' })],
      }),
      defineBeat({
        id: 'construct-trail', captionKey: copy.sectionTrail, flow: 'compile',
        cues: resetWithLoadoutReplacement('trail', ['cinder-trail', module.id], copy.sectionTrail, 'top-right'),
      }),
      defineBeat({
        id: 'show-trail-loadout', captionKey: copy.beatTrail, flow: 'trail',
        cues: [
          explainLoadoutSlot('point-trail-projectile', 4.2, copy.beatTrail, 1),
        ],
      }),
      defineBeat({
        id: 'fire-trail-line', captionKey: copy.beatTrailExtent, flow: 'trail',
        cues: fireCapturedRun('trail-line', {
          carrier: module.id,
          inputs: trailTargets,
          capture: { type: 'status-applied', occurrence: 2, captureAs: 'trailAffected' },
          captureTimeout: 10,
        }),
      }),
      defineBeat({
        id: 'show-trail-line', captionKey: copy.beatTrailExtent, flow: 'trail',
        cues: [showPause({ id: 'point-trail-line', captionKey: copy.beatTrailExtent, target: { signalRef: 'trailAffected' }, requireAlive: 'trailAffected' })],
      }),
      defineBeat({
        id: 'construct-focus', captionKey: copy.sectionFocus, flow: 'compile',
        cues: resetWithLoadoutReplacement('focus', ['focus-core', module.id], copy.sectionFocus, 'top-right'),
      }),
      defineBeat({
        id: 'show-focus-loadout', captionKey: copy.beatFocus, flow: 'focus',
        cues: [
          explainLoadoutSlot('point-focused-projectile', 4.2, copy.beatFocus, 1),
        ],
      }),
      defineBeat({
        id: 'fire-focused-projectile', captionKey: copy.beatFocusedHit, flow: 'focus',
        cues: fireCapturedRun('focused-projectile', {
          carrier: module.id,
          inputs: focusTargets,
          capture: { type: 'projectile-hit', moduleId: module.id },
        }),
      }),
      defineBeat({
        id: 'show-focused-hit', captionKey: copy.beatFocusedHit, flow: 'focus',
        cues: [showPause({ id: 'point-focused-neighbor', captionKey: copy.beatFocusedHit, target: { signalRef: 'focusSecond' }, requireAlive: 'focusSecond' })],
      }),
      defineBeat({
        id: 'finish-focused-projectile', captionKey: copy.sectionFocus, flow: 'observe',
        cues: finishRun('finish-focused-projectile', 0, STRAIGHT_LANE_CLEANUP),
      }),
    ],
  });
};
