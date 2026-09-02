import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  introduceScene,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { straightRangePassScene } from '../thoughts/scenes';
import { frostModule } from './frost';

const copy = {
  title: 'thoughts.frost.title',
  summary: 'thoughts.frost.summary',
  sections: {
    projectile: 'thoughts.frost.sections.projectile',
    area: 'thoughts.frost.sections.area',
    static: 'thoughts.frost.sections.static',
  },
  beats: {
    modifier: 'thoughts.frost.beats.modifier',
    carrier: 'thoughts.frost.beats.carrier',
    slowed: 'thoughts.frost.beats.slowed',
    area: 'thoughts.frost.beats.area',
    staticModifier: 'thoughts.frost.beats.staticModifier',
    staticAffects: 'thoughts.frost.beats.staticAffects',
    staticLater: 'thoughts.frost.beats.staticLater',
  },
} as const;

export const frostThought = defineModuleThought(frostModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 19,
  scene: straightRangePassScene({
    signalHealthScale: 0.72,
    signalSpeedScale: 0.92,
    towerSlots: 4,
  }),
  initialScene: {
    pathProgress: 0,
    towerPadOpacity: 0,
    towerOpacity: 0,
    signalOpacity: 0,
    simulationRate: 1,
  },
  beats: [
    defineBeat({
      id: 'construct-projectile',
      captionKey: copy.sections.projectile,
      flow: 'compile',
      cues: introduceScene({ slots: ['frost', 'pulse'] }),
    }),
    defineBeat({
      id: 'projectile-loadout',
      captionKey: copy.sections.projectile,
      flow: 'compile',
      cues: [
        timedCue('show-projectile-modifier', 0.75, {
          sectionTitleKey: copy.sections.projectile,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog',
          loadoutVisibleSlots: 1,
        }),
        timedCue('show-projectile-carrier', 2.45, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleSlots: 2,
        }),
      ],
    }),
    defineBeat({
      id: 'explain-frost',
      captionKey: copy.beats.modifier,
      flow: 'compile',
      cues: [explainLoadoutSlot('point-frost', 4.2, copy.beats.modifier, 0)],
    }),
    defineBeat({
      id: 'explain-pulse',
      captionKey: copy.beats.carrier,
      flow: 'compile',
      cues: [explainLoadoutSlot('point-pulse', 4.2, copy.beats.carrier, 1)],
    }),
    defineBeat({
      id: 'fire-projectile',
      captionKey: copy.beats.slowed,
      flow: 'impact',
      cues: [
        timedCue('dismiss-projectile-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-projectile-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-projectile-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 } },
          ],
          transition: { signalOpacity: 1 },
          ease: 'ease-out',
        }),
        waitCue('wait-projectile-hit', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'signal-slowed', moduleId: 'frost', captureAs: 'projectileTarget' },
          timeout: 14,
          timelineWait: true,
        }),
        timedCue('settle-projectile-hit', 0.5, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          requireSignalState: { signalRef: 'projectileTarget', alive: true, slowed: true },
        }),
      ],
    }),
    defineBeat({
      id: 'show-slow',
      captionKey: copy.beats.slowed,
      flow: 'impact',
      cues: [
        timedCue('point-slowed-signal', 4.4, {
          transitionDuration: 1.35,
          transition: { simulationRate: 0 },
          ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beats.slowed, target: { signalRef: 'projectileTarget' } },
          requireSignalState: { signalRef: 'projectileTarget', alive: true, slowed: true },
        }),
      ],
    }),
    defineBeat({
      id: 'resume-projectile',
      captionKey: copy.sections.projectile,
      flow: 'observe',
      cues: [
        timedCue('restore-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-projectile-clear', {
          waitForClear: true,
          waitForTowerEnergy: true,
          timeout: 20,
          timelineWait: true,
        }),
        timedCue('settle-projectile-clear', 0.5, {
          transition: { towerRotation: -Math.PI / 2 },
          ease: 'smooth',
        }),
      ],
    }),
    defineBeat({
      id: 'construct-area',
      captionKey: copy.sections.area,
      flow: 'compile',
      cues: [
        timedCue('dismiss-projectile-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('show-area-loadout', 1.45, {
          sectionTitleKey: copy.sections.area,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog',
          loadoutVisibleSlots: 2,
          transition: { signalOpacity: 0 },
        }),
        timedCue('replace-area-carrier', 2.4, {
          actions: [{ type: 'setup', slots: ['frost', 'nova'] }],
          animateLoadoutChanges: true,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
        }),
      ],
    }),
    defineBeat({
      id: 'explain-nova',
      captionKey: copy.beats.area,
      flow: 'compile',
      cues: [explainLoadoutSlot('point-nova', 4.4, copy.beats.area, 1)],
    }),
    defineBeat({
      id: 'fire-area',
      captionKey: copy.beats.area,
      flow: 'impact',
      cues: [
        timedCue('dismiss-area-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-area-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-area-targets', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 68 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 52 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 36 } },
          ],
          transition: { signalOpacity: 1 },
          ease: 'ease-out',
        }),
        waitCue('wait-area-hit', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'signal-slowed', moduleId: 'frost' },
          timeout: 14,
          timelineWait: true,
        }),
        waitCue('wait-area-clear', {
          waitForClear: true,
          waitForTowerEnergy: true,
          timeout: 20,
          timelineWait: true,
        }),
        timedCue('settle-area-clear', 0.5, {
          transition: { towerRotation: -Math.PI / 2 },
          ease: 'smooth',
        }),
      ],
    }),
    defineBeat({
      id: 'construct-static',
      captionKey: copy.sections.static,
      flow: 'compile',
      cues: [
        timedCue('dismiss-area-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('configure-static', 0.2, {
          actions: [{ type: 'setup', slots: ['impact-trigger', 'pulse', 'frost', 'toxic-cloud'] }],
          loadoutMode: 'hidden',
          transition: { signalOpacity: 0 },
        }),
        timedCue('show-static-trigger', 0.65, {
          sectionTitleKey: copy.sections.static,
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
      captionKey: copy.beats.staticModifier,
      flow: 'compile',
      cues: [explainLoadoutSlot('point-static-modifier', 4.2, copy.beats.staticModifier, 2)],
    }),
    defineBeat({
      id: 'explain-static-payload',
      captionKey: copy.beats.staticAffects,
      flow: 'compile',
      cues: [explainLoadoutSlot('point-static-payload', 4.2, copy.beats.staticAffects, 3)],
    }),
    defineBeat({
      id: 'deploy-static',
      captionKey: copy.sections.static,
      flow: 'payload',
      cues: [
        timedCue('dismiss-static-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-static-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-static-deployment-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'staticDeploymentTarget' },
          ],
          transition: { signalOpacity: 1 },
          ease: 'ease-out',
        }),
        waitCue('wait-static-deployment', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'payload-deployed', moduleId: 'toxic-cloud', captureAs: 'staticPayload' },
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
      captionKey: copy.beats.staticAffects,
      flow: 'payload',
      cues: [
        timedCue('spawn-static-first', 0.45, {
          actions: [{ type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 38 }, captureAs: 'staticFirst' }],
        }),
        timedCue('spawn-static-second', 0.45, {
          actions: [{ type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 18 }, captureAs: 'staticSecond' }],
        }),
        waitCue('wait-static-pair-slowed', {
          waitForSignalStates: [
            { signalRef: 'staticFirst', alive: true, slowed: true },
            { signalRef: 'staticSecond', alive: true, slowed: true },
          ],
          timeout: 5,
          timelineWait: true,
        }),
        timedCue('settle-static-pair', 0.65),
      ],
    }),
    defineBeat({
      id: 'show-static-effect',
      captionKey: copy.beats.staticAffects,
      flow: 'payload',
      cues: [
        timedCue('point-static-effect', 4.4, {
          transitionDuration: 1.35,
          transition: { simulationRate: 0 },
          ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beats.staticAffects, target: { projectileRef: 'staticPayload' } },
        }),
      ],
    }),
    defineBeat({
      id: 'enter-static-later',
      captionKey: copy.beats.staticLater,
      flow: 'payload',
      cues: [
        timedCue('restore-static-time', 1.35, {
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        timedCue('spawn-static-later', 0.3, {
          actions: [{ type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 10 }, captureAs: 'staticLater' }],
        }),
        waitCue('wait-static-later-slowed', {
          waitForSignalStates: [{ signalRef: 'staticLater', alive: true, slowed: true }],
          timeout: 4,
          timelineWait: true,
        }),
        timedCue('settle-static-later', 0.5),
      ],
    }),
    defineBeat({
      id: 'show-static-later',
      captionKey: copy.beats.staticLater,
      flow: 'payload',
      cues: [
        timedCue('point-static-later', 4.4, {
          transitionDuration: 1.35,
          transition: { simulationRate: 0 },
          ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beats.staticLater, target: { signalRef: 'staticLater' } },
          requireSignalState: { signalRef: 'staticLater', alive: true, slowed: true },
        }),
      ],
    }),
    defineBeat({
      id: 'finish-static',
      captionKey: copy.sections.static,
      flow: 'observe',
      cues: [
        timedCue('restore-static-finish', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 },
          ease: 'smooth',
        }),
        waitCue('wait-static-clear', {
          waitForClear: true,
          waitForTowerEnergy: true,
          timeout: 20,
          timelineWait: true,
        }),
        timedCue('settle-static-clear', 1.5, {
          transition: { towerRotation: -Math.PI / 2 },
          ease: 'smooth',
        }),
      ],
    }),
  ],
});
