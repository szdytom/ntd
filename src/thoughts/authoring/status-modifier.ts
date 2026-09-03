import type { ModuleDefinition } from '../../modules/types';
import type { ModuleId, SignalId } from '../../game/types';
import type { ScenarioSignalPosition } from '../../game/combat-runtime';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../scenes';
import type { ThoughtDefinition } from '../types';
import { defineBeat } from './beats';
import { defineModuleThought } from './define';
import { timedCue, waitCue } from './cues';
import { explainLoadoutSlot, introduceScene } from './recipes';
import { finishRun, fireCapturedRun, resetTo, settleTowerForReset, showPause } from './sequences';

export interface StatusModifierCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionDirect: string;
  readonly sectionArea: string;
  readonly sectionStatic: string;
  readonly beatCoat: string;
  readonly beatTick: string;
  readonly beatAreaAll: string;
  readonly beatStaticModifier: string;
  readonly beatStaticAffects: string;
  readonly beatStaticLater: string;
}

interface StatusModifierOptions {
  readonly module: ModuleDefinition;
  readonly copy: StatusModifierCopy;
  readonly seed: number;
  readonly carrier: ModuleId;
  readonly areaCarrier: ModuleId;
  readonly staticCarrier?: ModuleId;
}

interface SignalSpawn {
  readonly signal: SignalId;
  readonly position: ScenarioSignalPosition;
  readonly captureAs?: string;
}

const directTarget: SignalSpawn = {
  signal: 'kite',
  position: { type: 'tower-range-entry', leadDistance: 44 },
  captureAs: 'directTarget',
};

const areaTargets: readonly SignalSpawn[] = [
  { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 70 }, captureAs: 'areaLead' },
  { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 52 }, captureAs: 'areaMid' },
  { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'areaTail' },
];

/**
 * Builds the status-modifier thought shared by Ember Coating, Corrosive Spore,
 * Searing Sigil, and Starfire Matrix. The four modules differ only in status
 * strength and copy, so one story proves the family rule across direct,
 * area, and persistent static carriers.
 */
export const buildStatusModifierThought = (options: StatusModifierOptions): ThoughtDefinition => {
  const { module, copy, seed, carrier, areaCarrier, staticCarrier = 'toxic-cloud' } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 4, signalHealthScale: 3, signalSpeedScale: 0.85 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct',
        captionKey: copy.sectionDirect,
        flow: 'compile',
        cues: introduceScene({ slots: [module.id, carrier] }),
      }),
      defineBeat({
        id: 'show-direct',
        captionKey: copy.sectionDirect,
        flow: 'compile',
        cues: [
          timedCue('show-mod', 0.75, { sectionTitleKey: copy.sectionDirect, overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutMode: 'dialog', loadoutVisibleSlots: 1 }),
          timedCue('show-carrier', 2.45, { overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2 }),
        ],
      }),
      defineBeat({
        id: 'explain-mod',
        captionKey: copy.beatCoat,
        flow: 'compile',
        cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatCoat, 0)],
      }),
      defineBeat({
        id: 'fire-direct',
        captionKey: copy.beatTick,
        flow: 'impact',
        cues: fireCapturedRun('direct', {
          carrier,
          inputs: [directTarget],
          capture: { type: 'status-applied', occurrence: 1 },
        }),
      }),
      defineBeat({
        id: 'show-tick',
        captionKey: copy.beatTick,
        flow: 'impact',
        cues: [showPause({ id: 'point-direct', captionKey: copy.beatTick, target: { signalRef: 'directTarget' }, requireAlive: 'directTarget' })],
      }),
      defineBeat({
        id: 'construct-area',
        captionKey: copy.sectionArea,
        flow: 'compile',
        cues: resetTo('area', [module.id, areaCarrier], copy.sectionArea, 1),
      }),
      defineBeat({
        id: 'reveal-area',
        captionKey: copy.sectionArea,
        flow: 'compile',
        cues: [timedCue('show-area-carrier', 2.45, { overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2 })],
      }),
      defineBeat({
        id: 'fire-area',
        captionKey: copy.beatAreaAll,
        flow: 'impact',
        cues: fireCapturedRun('area', {
          carrier: areaCarrier,
          inputs: areaTargets,
          capture: { type: 'status-applied', occurrence: 1 },
        }),
      }),
      defineBeat({
        id: 'show-area',
        captionKey: copy.beatAreaAll,
        flow: 'impact',
        cues: [showPause({ id: 'point-area', captionKey: copy.beatAreaAll, target: { signalRef: 'areaLead' }, requireAlive: 'areaLead' })],
      }),
      defineBeat({
        id: 'construct-static',
        captionKey: copy.sectionStatic,
        flow: 'compile',
        cues: [
          timedCue('restore-area-time', 1.35, {
            actions: [{ type: 'set-tower-casting', enabled: true }],
            transition: { simulationRate: 1 },
            ease: 'smooth',
          }),
          timedCue('fade-area-signals', 0.5, { transition: { signalOpacity: 0 }, ease: 'ease-out' }),
          timedCue('dismiss-area-compact', 0.35, { loadoutMode: 'compact-leaving' }),
          settleTowerForReset('settle-area-rotation'),
          timedCue('configure-static', 0.2, {
            actions: [{ type: 'setup', slots: ['impact-trigger', 'pulse', module.id, staticCarrier] }],
            loadoutMode: 'hidden',
          }),
          timedCue('show-static-trigger', 0.65, {
            sectionTitleKey: copy.sectionStatic,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutMode: 'dialog',
            loadoutVisibleSlots: 1,
          }),
          timedCue('show-static-carrier', 0.55, {
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutVisibleSlots: 2,
          }),
          timedCue('show-static-modifier', 0.55, {
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutVisibleSlots: 3,
          }),
          timedCue('show-static-payload', 2.9, {
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutVisibleSlots: 4,
          }),
        ],
      }),
      defineBeat({
        id: 'explain-static-modifier',
        captionKey: copy.beatStaticModifier,
        flow: 'compile',
        cues: [explainLoadoutSlot('point-static-modifier', 4.2, copy.beatStaticModifier, 2)],
      }),
      defineBeat({
        id: 'explain-static-payload',
        captionKey: copy.beatStaticAffects,
        flow: 'compile',
        cues: [explainLoadoutSlot('point-static-payload', 4.2, copy.beatStaticAffects, 3)],
      }),
      defineBeat({
        id: 'deploy-static',
        captionKey: copy.sectionStatic,
        flow: 'payload',
        cues: [
          timedCue('dismiss-static-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
          timedCue('compact-static-loadout', 0.35, { loadoutMode: 'compact' }),
          timedCue('spawn-static-deployment-target', 0.7, {
            actions: [
              { type: 'set-tower-casting', enabled: false },
              { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 44 } },
            ],
            transition: { signalOpacity: 1 },
            ease: 'ease-out',
          }),
          waitCue('wait-static-deployment', {
            actions: [{ type: 'set-tower-casting', enabled: true }],
            waitFor: { type: 'payload-deployed', moduleId: staticCarrier, captureAs: 'staticPayload' },
            timeout: 14,
            timelineWait: true,
          }),
          timedCue('settle-static-deployment', 0.5, {
            actions: [{ type: 'set-tower-casting', enabled: false }],
          }),
        ],
      }),
      defineBeat({
        id: 'enter-static-field',
        captionKey: copy.beatStaticAffects,
        flow: 'payload',
        cues: [
          timedCue('spawn-static-pair', 0.7, {
            actions: [
              { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 38 }, captureAs: 'staticFirst' },
              { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 18 }, captureAs: 'staticSecond' },
            ],
          }),
          waitCue('wait-static-pair-affected', {
            waitForSignalStates: [
              { signalRef: 'staticFirst', alive: true, statusId: module.id },
              { signalRef: 'staticSecond', alive: true, statusId: module.id },
            ],
            timeout: 5,
            timelineWait: true,
          }),
          timedCue('settle-static-pair', 0.5),
        ],
      }),
      defineBeat({
        id: 'show-static-effect',
        captionKey: copy.beatStaticAffects,
        flow: 'payload',
        cues: [timedCue('point-static-effect', 4.2, {
          transitionDuration: 0.8,
          transition: { simulationRate: 0 },
          ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beatStaticAffects, target: { projectileRef: 'staticPayload' } },
        })],
      }),
      defineBeat({
        id: 'enter-static-later',
        captionKey: copy.beatStaticLater,
        flow: 'payload',
        cues: [
          timedCue('restore-static-time', 0.8, { transition: { simulationRate: 1 }, ease: 'smooth' }),
          timedCue('spawn-static-later', 0.3, {
            actions: [{ type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 10 }, captureAs: 'staticLater' }],
          }),
          waitCue('wait-static-later-affected', {
            waitForSignalStates: [{ signalRef: 'staticLater', alive: true, statusId: module.id }],
            timeout: 4,
            timelineWait: true,
          }),
          timedCue('settle-static-later', 0.4),
        ],
      }),
      defineBeat({
        id: 'show-static-later',
        captionKey: copy.beatStaticLater,
        flow: 'payload',
        cues: [timedCue('point-static-later', 4.2, {
          transitionDuration: 0.8,
          transition: { simulationRate: 0 },
          ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beatStaticLater, target: { signalRef: 'staticLater' } },
          requireSignalState: { signalRef: 'staticLater', alive: true, statusId: module.id },
        })],
      }),
      defineBeat({
        id: 'finish-static',
        captionKey: copy.sectionStatic,
        flow: 'observe',
        cues: finishRun('finish-static', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
      }),
    ],
  });
};
