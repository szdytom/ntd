import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  introduceScene,
  LOADOUT_ADDITION_CADENCE,
  settleTowerForReset,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { straightFiringLaneScene } from '../thoughts/scenes';
import { impactTriggerModule } from '@prism-bastion/game-core/modules/impact-trigger';

const copy = {
  title: 'thoughts.impactTrigger.title',
  summary: 'thoughts.impactTrigger.summary',
  sections: {
    deploy: 'thoughts.impactTrigger.sections.deploy',
    pierce: 'thoughts.impactTrigger.sections.pierce',
    shield: 'thoughts.impactTrigger.sections.shield',
  },
  beats: {
    carrier: 'thoughts.impactTrigger.beats.carrier',
    payload: 'thoughts.impactTrigger.beats.payload',
    deployed: 'thoughts.impactTrigger.beats.deployed',
    once: 'thoughts.impactTrigger.beats.once',
    shielded: 'thoughts.impactTrigger.beats.shielded',
  },
} as const;

export const impactTriggerThought = defineModuleThought(impactTriggerModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  relatedDiagnostics: ['missing-payload'],
  seed: 23,
  scene: straightFiringLaneScene({ towerSlots: 3, signalHealthScale: 1, signalSpeedScale: 0.25 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-impact', captionKey: copy.sections.deploy, flow: 'compile',
      cues: introduceScene({ slots: ['impact-trigger', 'pulse', 'toxic-cloud'] }),
    }),
    defineBeat({
      id: 'show-impact-loadout', captionKey: copy.sections.deploy, flow: 'compile',
      cues: [
        timedCue('show-impact-trigger', LOADOUT_ADDITION_CADENCE, {
          sectionTitleKey: copy.sections.deploy,
          overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        }),
        timedCue('show-impact-carrier', LOADOUT_ADDITION_CADENCE, {
          overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 2,
        }),
        timedCue('show-impact-payload', 2.2, {
          overlay: { type: 'loadout', target: 'tower', placement: 'top-right' }, loadoutVisibleSlots: 3,
        }),
      ],
    }),
    defineBeat({
      id: 'explain-impact-carrier', captionKey: copy.beats.carrier, flow: 'compile',
      cues: [explainLoadoutSlot('point-impact-carrier', 4.2, copy.beats.carrier, 1)],
    }),
    defineBeat({
      id: 'explain-impact-payload', captionKey: copy.beats.payload, flow: 'compile',
      cues: [explainLoadoutSlot('point-impact-payload', 4.2, copy.beats.payload, 2)],
    }),
    defineBeat({
      id: 'deploy-impact-payload', captionKey: copy.beats.deployed, flow: 'payload',
      cues: [
        timedCue('dismiss-impact-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-impact-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-impact-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'route-progress', progress: 0.03 }, captureAs: 'impactTarget' },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-impact-payload', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'payload-deployed', moduleId: 'toxic-cloud', captureAs: 'impactCloud' },
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-impact-payload', 0.5, { actions: [{ type: 'set-tower-casting', enabled: false }] }),
      ],
    }),
    defineBeat({
      id: 'show-impact-payload', captionKey: copy.beats.deployed, flow: 'payload',
      cues: [timedCue('point-impact-cloud', 4.2, {
        transitionDuration: 0.9, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.deployed, target: { projectileRef: 'impactCloud' } },
      })],
    }),
    defineBeat({
      id: 'finish-impact-payload', captionKey: copy.sections.deploy, flow: 'observe',
      cues: [
        timedCue('restore-impact-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-impact-clear', { waitForClear: true, waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
        settleTowerForReset('settle-impact-clear'),
      ],
    }),
    defineBeat({
      id: 'construct-pierce', captionKey: copy.sections.pierce, flow: 'compile',
      cues: [
        timedCue('dismiss-impact-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('show-before-pierce', 0.9, {
          sectionTitleKey: copy.sections.pierce,
          overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 3,
          transition: { signalOpacity: 0 },
        }),
        timedCue('replace-carrier-with-pierce', 2.4, {
          actions: [{ type: 'setup', slots: ['impact-trigger', 'needle', 'toxic-cloud'] }],
          animateLoadoutChanges: true,
          overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
        }),
      ],
    }),
    defineBeat({
      id: 'fire-piercing-carrier', captionKey: copy.beats.once, flow: 'impact',
      cues: [
        timedCue('dismiss-pierce-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-pierce-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-pierce-line', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'route-progress', progress: 0 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'route-progress', progress: 0.03 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'route-progress', progress: 0.06 } },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-pierce-trigger', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'trigger-fired', moduleId: 'impact-trigger', captureAs: 'pierceTrigger' },
          timeout: 12, timelineWait: true,
        }),
        waitCue('wait-pierce-third-hit', {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          waitFor: { type: 'projectile-hit', moduleId: 'needle', occurrence: 3, captureAs: 'pierceFinalHit' },
          timeout: 4, timelineWait: true,
        }),
        timedCue('settle-pierce-hits', 0.5),
      ],
    }),
    defineBeat({
      id: 'show-single-trigger', captionKey: copy.beats.once, flow: 'observe',
      cues: [timedCue('point-single-trigger', 4.2, {
        transitionDuration: 0.9, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.once, target: { slot: 0 } },
        highlightSlots: [0],
      })],
    }),
    defineBeat({
      id: 'finish-pierce', captionKey: copy.sections.pierce, flow: 'observe',
      cues: [
        timedCue('restore-pierce-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-pierce-scene-clear', {
          waitForSignalsOutOfRange: true, timeout: 20, timelineWait: true,
        }),
        timedCue('fade-pierce-scene', 0.5, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { signalOpacity: 0 }, ease: 'ease-out',
        }),
        settleTowerForReset('settle-pierce-clear'),
      ],
    }),
    defineBeat({
      id: 'construct-shield', captionKey: copy.sections.shield, flow: 'compile',
      cues: [
        timedCue('dismiss-pierce-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('show-before-shield', 0.9, {
          sectionTitleKey: copy.sections.shield,
          overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 3,
          transition: { signalOpacity: 0 },
        }),
        timedCue('replace-carrier-for-shield', 2.4, {
          actions: [{ type: 'setup', slots: ['impact-trigger', 'pulse', 'toxic-cloud'] }],
          animateLoadoutChanges: true,
          overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
        }),
      ],
    }),
    defineBeat({
      id: 'fire-at-shield', captionKey: copy.beats.shielded, flow: 'impact',
      cues: [
        timedCue('dismiss-shield-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-shield-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-shield-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'crown', position: { type: 'route-progress', progress: 0.03 }, captureAs: 'shieldTarget' },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-shield-absorb', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-absorbed', moduleId: 'impact-trigger', captureAs: 'shieldAbsorb' },
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-shield-absorb', 0.5, { actions: [{ type: 'set-tower-casting', enabled: false }] }),
      ],
    }),
    defineBeat({
      id: 'show-blocked-trigger', captionKey: copy.beats.shielded, flow: 'impact',
      cues: [timedCue('point-shield-absorb', 4.2, {
        transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.shielded, target: { signalRef: 'shieldAbsorb' } },
        requireSignalState: { signalRef: 'shieldAbsorb', alive: true },
      })],
    }),
    defineBeat({
      id: 'finish-shield', captionKey: copy.sections.shield, flow: 'observe',
      cues: [
        timedCue('restore-shield-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-shield-target-clear', {
          waitForSignalsOutOfRange: true, timeout: 20, timelineWait: true,
        }),
        timedCue('fade-shield-target', 0.5, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { signalOpacity: 0 }, ease: 'ease-out',
        }),
        settleTowerForReset('settle-shield-rotation'),
        timedCue('reset-shield-scene', 0.2, {
          actions: [{ type: 'setup', slots: ['impact-trigger', 'pulse', 'toxic-cloud'] }],
        }),
      ],
    }),
  ],
});
