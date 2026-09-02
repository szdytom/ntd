import type { ModuleDefinition } from '../../modules/types';
import type { ModuleId, SignalId } from '../../game/types';
import type { ScenarioSignalPosition } from '../../game/combat-runtime';
import { straightRangePassScene } from '../scenes';
import type { ThoughtDefinition } from '../types';
import { defineBeat } from './beats';
import { defineModuleThought } from './define';
import { timedCue } from './cues';
import { explainLoadoutSlot, introduceScene } from './recipes';
import { finishRun, fireCapturedRun, resetTo, showPause } from './sequences';

export interface StatusModifierCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionDirect: string;
  readonly sectionArea: string;
  readonly beatCoat: string;
  readonly beatTick: string;
  readonly beatAreaAll: string;
}

interface StatusModifierOptions {
  readonly module: ModuleDefinition;
  readonly copy: StatusModifierCopy;
  readonly seed: number;
  readonly carrier: ModuleId;
  readonly areaCarrier: ModuleId;
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
 * strength and copy, so one story proves the family rule: the status is
 * implanted on every target the projectile damages.
 */
export const buildStatusModifierThought = (options: StatusModifierOptions): ThoughtDefinition => {
  const { module, copy, seed, carrier, areaCarrier } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 3, signalSpeedScale: 0.85 }),
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
        cues: [
          timedCue('show-area-carrier', 2.45, { overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2 }),
          explainLoadoutSlot('point-area-carrier', 4.2, copy.beatAreaAll, 1),
        ],
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
        id: 'finish',
        captionKey: copy.sectionArea,
        flow: 'observe',
        cues: finishRun('finish', -Math.PI / 2),
      }),
    ],
  });
};
