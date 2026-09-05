import type { ModuleDefinition } from '@prism-bastion/game-core/modules/types';
import type { ThoughtDefinition } from '../types';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../scenes';
import { defineBeat } from './beats';
import { timedCue, waitCue } from './cues';
import { defineModuleThought } from './define';
import { explainLoadoutSlot, introduceScene } from './recipes';
import { finishRun, fireCapturedRun, resetTo, resetWithLoadoutReplacement, showPause } from './sequences';

export interface AreaProjectileCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionBlast: string;
  readonly sectionModifier: string;
  readonly sectionCondense: string;
  readonly beatFlight: string;
  readonly beatBlast: string;
  readonly beatModifier: string;
  readonly beatModifiedAll: string;
  readonly beatCondense: string;
  readonly beatCondensedHit: string;
}

interface AreaProjectileThoughtOptions {
  readonly module: ModuleDefinition;
  readonly copy: AreaProjectileCopy;
  readonly seed: number;
}

const blastTargets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 70 }, captureAs: 'blastLead' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 52 }, captureAs: 'blastMid' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 34 }, captureAs: 'blastTail' },
];

const modifiedTargets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 70 } },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 52 } },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 34 } },
];

const condensedTargets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 60 }, captureAs: 'condensedDirect' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 44 }, captureAs: 'condensedNear' },
];

/** Teaches the shared area-projectile contract, modifier spread, and Condense Core boundary. */
export const buildAreaProjectileThought = (
  options: AreaProjectileThoughtOptions,
): ThoughtDefinition => {
  const { module, copy, seed } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct-blast', captionKey: copy.sectionBlast, flow: 'compile',
        cues: introduceScene({ slots: [module.id] }),
      }),
      defineBeat({
        id: 'show-blast-loadout', captionKey: copy.sectionBlast, flow: 'compile',
        cues: [timedCue('show-projectile', 3.2, {
          sectionTitleKey: copy.sectionBlast,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        })],
      }),
      defineBeat({
        id: 'launch-projectile', captionKey: copy.beatFlight, flow: 'cast',
        cues: [
          timedCue('dismiss-projectile', 0.45, { loadoutMode: 'dialog-leaving' }),
          timedCue('compact-projectile', 0.35, { loadoutMode: 'compact' }),
          timedCue('spawn-blast-targets', 0.7, {
            actions: [
              { type: 'set-tower-casting', enabled: false },
              ...blastTargets.map((target) => ({ type: 'spawn-signal' as const, ...target })),
            ],
            transition: { signalOpacity: 1 }, ease: 'ease-out',
          }),
          waitCue('wait-projectile-launch', {
            actions: [{ type: 'set-tower-casting', enabled: true }],
            waitFor: { type: 'projectile-spawned', moduleId: module.id, captureAs: 'areaProjectile' },
            timeout: 12, timelineWait: true,
          }),
        ],
      }),
      defineBeat({
        id: 'show-projectile-flight', captionKey: copy.beatFlight, flow: 'cast',
        cues: [timedCue('point-projectile-flight', 4.2, {
          transitionDuration: 0.18, transition: { simulationRate: 0 }, ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beatFlight, target: { projectileRef: 'areaProjectile' } },
        })],
      }),
      defineBeat({
        id: 'detonate-projectile', captionKey: copy.beatBlast, flow: 'impact',
        cues: [
          timedCue('resume-projectile-flight', 0.65, {
            actions: [{ type: 'set-tower-casting', enabled: false }],
            transition: { simulationRate: 1 }, ease: 'smooth',
          }),
          waitCue('wait-projectile-impact', {
            waitFor: { type: 'projectile-hit', moduleId: module.id },
            timeout: 8, timelineWait: true,
          }),
          timedCue('settle-projectile-impact', 0.5),
        ],
      }),
      defineBeat({
        id: 'show-projectile-blast', captionKey: copy.beatBlast, flow: 'impact',
        cues: [showPause({ id: 'point-projectile-blast', captionKey: copy.beatBlast, target: { signalRef: 'blastMid' }, requireAlive: 'blastMid' })],
      }),
      defineBeat({
        id: 'construct-modifier', captionKey: copy.sectionModifier, flow: 'compile',
        cues: resetTo('modifier', ['frost', module.id], copy.sectionModifier, 1, 'right', { start: 1, count: 1 }),
      }),
      defineBeat({
        id: 'show-modifier-loadout', captionKey: copy.beatModifier, flow: 'compile',
        cues: [
          timedCue('show-modified-carrier', 2.45, {
            overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2,
          }),
          explainLoadoutSlot('point-area-modifier', 4.2, copy.beatModifier, 0),
        ],
      }),
      defineBeat({
        id: 'fire-modified-projectile', captionKey: copy.beatModifiedAll, flow: 'impact',
        cues: fireCapturedRun('modified-area', {
          carrier: module.id,
          inputs: modifiedTargets,
          capture: { type: 'signal-slowed', moduleId: 'frost', occurrence: 3, captureAs: 'modifiedAreaTarget' },
        }),
      }),
      defineBeat({
        id: 'show-modified-area', captionKey: copy.beatModifiedAll, flow: 'impact',
        cues: [timedCue('point-modified-area', 4.2, {
          transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beatModifiedAll, target: { signalRef: 'modifiedAreaTarget' } },
          requireSignalState: { signalRef: 'modifiedAreaTarget', alive: true, slowed: true },
        })],
      }),
      defineBeat({
        id: 'construct-condense', captionKey: copy.sectionCondense, flow: 'compile',
        cues: resetWithLoadoutReplacement('condense', ['condense-core', module.id], copy.sectionCondense),
      }),
      defineBeat({
        id: 'show-condense-loadout', captionKey: copy.beatCondense, flow: 'focus',
        cues: [
          explainLoadoutSlot('point-condense-core', 4.2, copy.beatCondense, 0),
        ],
      }),
      defineBeat({
        id: 'fire-condensed-projectile', captionKey: copy.beatCondensedHit, flow: 'impact',
        cues: fireCapturedRun('condensed-area', {
          carrier: module.id,
          inputs: condensedTargets,
          capture: { type: 'projectile-hit', moduleId: module.id },
        }),
      }),
      defineBeat({
        id: 'show-condensed-hit', captionKey: copy.beatCondensedHit, flow: 'impact',
        cues: [showPause({ id: 'point-condensed-neighbor', captionKey: copy.beatCondensedHit, target: { signalRef: 'condensedDirect' }, requireAlive: 'condensedDirect' })],
      }),
      defineBeat({
        id: 'finish-condensed-projectile', captionKey: copy.sectionCondense, flow: 'observe',
        cues: finishRun('finish-condensed', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
      }),
    ],
  });
};
