import type { ModuleDefinition } from '../../modules/types';
import type { ThoughtDefinition } from '../types';
import {
  STRAIGHT_LANE_CLEANUP,
  straightFiringLaneScene,
  straightRangePassScene,
} from '../scenes';
import { defineBeat } from './beats';
import { timedCue } from './cues';
import { defineModuleThought } from './define';
import { explainLoadoutSlot, introduceScene } from './recipes';
import { finishRun, fireCapturedRun, showPause } from './sequences';

export interface DeferredTriggerCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionPrimary: string;
  readonly sectionCollision: string;
  readonly sectionShield: string;
  readonly beatTrigger: string;
  readonly beatPayload: string;
  readonly beatPrimary: string;
  readonly beatCollision: string;
  readonly beatShield: string;
}

interface DeferredTriggerOptions {
  readonly module: ModuleDefinition;
  readonly copy: DeferredTriggerCopy;
  readonly seed: number;
}

/** Teaches a non-impact condition, its damaging-collision fallback, and shield boundary. */
export const buildDeferredTriggerThought = (options: DeferredTriggerOptions): ThoughtDefinition => {
  const { module, copy, seed } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 5, signalSpeedScale: 0.65 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct-primary', captionKey: copy.sectionPrimary, flow: 'compile',
        cues: introduceScene({ slots: [module.id, 'void-beam', 'toxic-cloud'] }),
      }),
      defineBeat({
        id: 'show-primary-loadout', captionKey: copy.sectionPrimary, flow: 'compile',
        cues: [
          timedCue('show-trigger', 0.65, {
            sectionTitleKey: copy.sectionPrimary,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 1,
          }),
          timedCue('show-carrier', 0.55, {
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 2,
          }),
          timedCue('show-payload', 2.2, {
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 3,
          }),
        ],
      }),
      defineBeat({
        id: 'explain-trigger', captionKey: copy.beatTrigger, flow: 'compile',
        cues: [explainLoadoutSlot('point-trigger', 4.2, copy.beatTrigger, 0)],
      }),
      defineBeat({
        id: 'explain-payload', captionKey: copy.beatPayload, flow: 'compile',
        cues: [explainLoadoutSlot('point-payload', 4.2, copy.beatPayload, 2)],
      }),
      defineBeat({
        id: 'fire-primary', captionKey: copy.beatPrimary, flow: 'payload',
        cues: fireCapturedRun('primary-trigger', {
          carrier: 'void-beam',
          inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 74 }, captureAs: 'primaryTarget' }],
          capture: { type: 'payload-deployed', moduleId: 'toxic-cloud', captureAs: 'primaryCloud' },
          captureTimeout: 14,
          settleDuration: 0.35,
        }),
      }),
      defineBeat({
        id: 'show-primary-release', captionKey: copy.beatPrimary, flow: 'payload',
        cues: [showPause({
          id: 'point-primary-release', captionKey: copy.beatPrimary,
          target: { projectileRef: 'primaryCloud' },
        })],
      }),
      defineBeat({
        id: 'construct-collision', captionKey: copy.sectionCollision, flow: 'compile',
        cues: [
          timedCue('restore-primary-time', 0.8, { transition: { simulationRate: 1 }, ease: 'smooth' }),
          timedCue('fade-primary-scene', 0.45, {
            actions: [{ type: 'delete-signals' }], transition: { signalOpacity: 0 }, ease: 'ease-out',
          }),
          timedCue('dismiss-primary-compact', 0.35, { loadoutMode: 'compact-leaving' }),
          timedCue('show-before-collision', 1, {
            sectionTitleKey: copy.sectionCollision,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 3,
          }),
          timedCue('replace-carrier-for-collision', 2.4, {
            actions: [{ type: 'setup', slots: [module.id, 'pulse', 'toxic-cloud'] }],
            animateLoadoutChanges: true,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
          }),
        ],
      }),
      defineBeat({
        id: 'fire-collision', captionKey: copy.beatCollision, flow: 'impact',
        cues: fireCapturedRun('collision-trigger', {
          carrier: 'pulse',
          inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 36 }, captureAs: 'collisionTarget' }],
          capture: { type: 'payload-deployed', moduleId: 'toxic-cloud', captureAs: 'collisionCloud' },
          captureTimeout: 12,
          settleDuration: 0.35,
        }),
      }),
      defineBeat({
        id: 'show-collision-release', captionKey: copy.beatCollision, flow: 'payload',
        cues: [showPause({
          id: 'point-collision-release', captionKey: copy.beatCollision,
          target: { projectileRef: 'collisionCloud' },
        })],
      }),
      defineBeat({
        id: 'construct-shield', captionKey: copy.sectionShield, flow: 'compile',
        cues: [
          timedCue('restore-collision-time', 0.8, { transition: { simulationRate: 1 }, ease: 'smooth' }),
          timedCue('fade-collision-scene', 0.45, {
            actions: [{ type: 'delete-signals' }], transition: { signalOpacity: 0 }, ease: 'ease-out',
          }),
          timedCue('dismiss-collision-compact', 0.35, { loadoutMode: 'compact-leaving' }),
          timedCue('configure-shield', 0.2, {
            actions: [{ type: 'setup', slots: [module.id, 'pulse', 'toxic-cloud'] }], loadoutMode: 'hidden',
          }),
          timedCue('show-shield-loadout', 2.6, {
            sectionTitleKey: copy.sectionShield,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 3,
          }),
        ],
      }),
      defineBeat({
        id: 'fire-at-shield', captionKey: copy.beatShield, flow: 'impact',
        cues: fireCapturedRun('shield-trigger', {
          carrier: 'pulse',
          inputs: [{
            signal: 'crown',
            position: { type: 'tower-range-entry', leadDistance: -70 },
            captureAs: 'shieldTarget',
          }],
          capture: { type: 'projectile-absorbed', moduleId: module.id, captureAs: 'shieldAbsorb' },
          captureTimeout: 12,
          settleDuration: 0.5,
        }),
      }),
      defineBeat({
        id: 'show-blocked-trigger', captionKey: copy.beatShield, flow: 'impact',
        cues: [showPause({
          id: 'point-shield-absorb', captionKey: copy.beatShield,
          target: { signalRef: 'shieldAbsorb' }, requireAlive: 'shieldAbsorb',
        })],
      }),
      defineBeat({
        id: 'finish-shield', captionKey: copy.sectionShield, flow: 'observe',
        cues: [
          timedCue('restore-shield-time', 1.35, { transition: { simulationRate: 1 }, ease: 'smooth' }),
          timedCue('fade-shield-target', 0.5, { transition: { signalOpacity: 0 }, ease: 'ease-out' }),
          timedCue('reset-shield-scene', 0.2, {
            actions: [{ type: 'setup', slots: [module.id, 'pulse', 'toxic-cloud'] }],
            transition: { towerRotation: -Math.PI / 2 }, ease: 'smooth',
          }),
        ],
      }),
    ],
  });
};

export interface ExpirationTriggerCopy {
  readonly title: string;
  readonly summary: string;
  readonly sectionExpire: string;
  readonly sectionShield: string;
  readonly beatTrigger: string;
  readonly beatPayload: string;
  readonly beatFinalHit: string;
  readonly beatShield: string;
}

interface ExpirationTriggerOptions {
  readonly module: ModuleDefinition;
  readonly copy: ExpirationTriggerCopy;
  readonly seed: number;
}

/** Teaches final-hit expiration, then contrasts its shield behavior with Impact Trigger. */
export const buildExpirationTriggerThought = (options: ExpirationTriggerOptions): ThoughtDefinition => {
  const { module, copy, seed } = options;

  return defineModuleThought(module, {
    titleKey: copy.title,
    summaryKey: copy.summary,
    seed,
    scene: straightFiringLaneScene({ towerSlots: 3, signalHealthScale: 7, signalSpeedScale: 0.7 }),
    initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
    beats: [
      defineBeat({
        id: 'construct-expiration', captionKey: copy.sectionExpire, flow: 'compile',
        cues: introduceScene({ slots: [module.id, 'needle', 'toxic-cloud'] }),
      }),
      defineBeat({
        id: 'show-expiration-loadout', captionKey: copy.sectionExpire, flow: 'compile',
        cues: [
          timedCue('show-expiration-trigger', 0.65, {
            sectionTitleKey: copy.sectionExpire,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 1,
          }),
          timedCue('show-expiration-carrier', 0.55, {
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 2,
          }),
          timedCue('show-expiration-payload', 2.2, {
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 3,
          }),
        ],
      }),
      defineBeat({
        id: 'explain-expiration-trigger', captionKey: copy.beatTrigger, flow: 'compile',
        cues: [explainLoadoutSlot('point-expiration-trigger', 4.2, copy.beatTrigger, 0)],
      }),
      defineBeat({
        id: 'explain-expiration-payload', captionKey: copy.beatPayload, flow: 'compile',
        cues: [explainLoadoutSlot('point-expiration-payload', 4.2, copy.beatPayload, 2)],
      }),
      defineBeat({
        id: 'fire-expiring-needle', captionKey: copy.beatFinalHit, flow: 'impact',
        cues: fireCapturedRun('expiring-needle', {
          carrier: 'needle',
          inputs: [
            { signal: 'spark', position: { type: 'route-progress', progress: 0 }, captureAs: 'expirationFirst' },
            { signal: 'spark', position: { type: 'route-progress', progress: 0.05 } },
            { signal: 'spark', position: { type: 'route-progress', progress: 0.1 }, captureAs: 'expirationLast' },
          ],
          capture: { type: 'payload-deployed', moduleId: 'toxic-cloud', captureAs: 'expirationCloud' },
          captureTimeout: 12,
          settleDuration: 0.35,
        }),
      }),
      defineBeat({
        id: 'show-final-hit-release', captionKey: copy.beatFinalHit, flow: 'payload',
        cues: [showPause({
          id: 'point-final-hit-release', captionKey: copy.beatFinalHit,
          target: { projectileRef: 'expirationCloud' },
        })],
      }),
      defineBeat({
        id: 'construct-shield', captionKey: copy.sectionShield, flow: 'compile',
        cues: [
          timedCue('restore-expiration-time', 0.8, { transition: { simulationRate: 1 }, ease: 'smooth' }),
          timedCue('fade-expiration-scene', 0.45, {
            actions: [{ type: 'delete-signals' }], transition: { signalOpacity: 0 }, ease: 'ease-out',
          }),
          timedCue('dismiss-expiration-compact', 0.35, { loadoutMode: 'compact-leaving' }),
          timedCue('configure-shield', 0.2, {
            loadoutMode: 'hidden',
          }),
          timedCue('show-before-shield', 1, {
            sectionTitleKey: copy.sectionShield,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
            loadoutMode: 'dialog', loadoutVisibleSlots: 3,
          }),
          timedCue('replace-carrier-for-shield', 2.4, {
            actions: [{ type: 'setup', slots: [module.id, 'pulse', 'toxic-cloud'] }],
            animateLoadoutChanges: true,
            overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
          }),
        ],
      }),
      defineBeat({
        id: 'fire-at-shield', captionKey: copy.beatShield, flow: 'impact',
        cues: fireCapturedRun('expiration-shield', {
          carrier: 'pulse',
          inputs: [{ signal: 'crown', position: { type: 'route-progress', progress: 0.03 }, captureAs: 'shieldTarget' }],
          capture: { type: 'payload-deployed', moduleId: 'toxic-cloud', captureAs: 'shieldCloud' },
          captureTimeout: 12,
          settleDuration: 0.35,
        }),
      }),
      defineBeat({
        id: 'show-shield-release', captionKey: copy.beatShield, flow: 'payload',
        cues: [showPause({
          id: 'point-shield-release', captionKey: copy.beatShield,
          target: { signalRef: 'shieldTarget' }, requireAlive: 'shieldTarget',
        })],
      }),
      defineBeat({
        id: 'finish-shield', captionKey: copy.sectionShield, flow: 'observe',
        cues: finishRun('finish-shield', 0, STRAIGHT_LANE_CLEANUP),
      }),
    ],
  });
};
