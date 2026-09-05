import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  introduceScene,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { straightRangePassScene } from '../thoughts/scenes';
import { pulseModule } from '@prism-bastion/game-core/modules/pulse';

const copy = {
  title: 'thoughts.pulse.title',
  summary: 'thoughts.pulse.summary',
  sections: {
    hit: 'thoughts.pulse.sections.hit',
    carry: 'thoughts.pulse.sections.carry',
  },
  beats: {
    flight: 'thoughts.pulse.beats.flight',
    damage: 'thoughts.pulse.beats.damage',
    waiting: 'thoughts.pulse.beats.waiting',
    delivered: 'thoughts.pulse.beats.delivered',
  },
} as const;

export const pulseThought = defineModuleThought(pulseModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  accent: '#6558e8',
  relatedDiagnostics: ['unresolved-modifier'],
  seed: 11,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 0.72, signalSpeedScale: 0.92 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-pulse', captionKey: copy.sections.hit, flow: 'compile',
      cues: introduceScene({ slots: ['pulse'] }),
    }),
    defineBeat({
      id: 'show-pulse', captionKey: copy.sections.hit, flow: 'compile',
      cues: [timedCue('show-pulse-loadout', 3.2, {
        sectionTitleKey: copy.sections.hit,
        overlay: { type: 'loadout', target: 'tower', placement: 'right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      })],
    }),
    defineBeat({
      id: 'launch-pulse', captionKey: copy.beats.flight, flow: 'cast',
      cues: [
        timedCue('dismiss-pulse-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-pulse-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-pulse-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'pulseTarget' },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-pulse-launch', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'pulse', captureAs: 'pulseShot' },
          timeout: 12, timelineWait: true,
        }),
      ],
    }),
    defineBeat({
      id: 'show-pulse-flight', captionKey: copy.beats.flight, flow: 'cast',
      cues: [timedCue('point-pulse-flight', 4.2, {
        transitionDuration: 0.18, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.flight, target: { projectileRef: 'pulseShot' } },
      })],
    }),
    defineBeat({
      id: 'show-pulse-damage', captionKey: copy.beats.damage, flow: 'impact',
      cues: [
        timedCue('restore-pulse-flight', 0.65, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-pulse-hit', {
          waitFor: { type: 'projectile-hit', moduleId: 'pulse', captureAs: 'pulseHit' },
          timeout: 6, timelineWait: true,
        }),
        timedCue('settle-pulse-hit', 0.5),
        timedCue('point-pulse-damage', 4.2, {
          transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beats.damage, target: { signalRef: 'pulseHit' } },
          requireSignalState: { signalRef: 'pulseHit', alive: true },
        }),
      ],
    }),
    defineBeat({
      id: 'finish-pulse-hit', captionKey: copy.sections.hit, flow: 'observe',
      cues: [
        timedCue('restore-pulse-hit', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-pulse-clear', { waitForClear: true, waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
        timedCue('settle-pulse-clear', 0.5, {
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 }, ease: 'smooth',
        }),
      ],
    }),
    defineBeat({
      id: 'construct-carrier', captionKey: copy.sections.carry, flow: 'compile',
      cues: [
        timedCue('dismiss-pulse-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('configure-carrier', 0.2, {
          actions: [{ type: 'setup', slots: ['frost', 'pulse'] }],
          loadoutMode: 'hidden', transition: { signalOpacity: 0 },
        }),
        timedCue('show-carrier-pulse', 1.15, {
          sectionTitleKey: copy.sections.carry,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleRange: { start: 1, count: 1 },
        }),
        timedCue('insert-carrier-frost', 2.5, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleRange: { start: 0, count: 2 },
        }),
      ],
    }),
    defineBeat({
      id: 'explain-waiting-modifier', captionKey: copy.beats.waiting, flow: 'compile',
      cues: [explainLoadoutSlot('point-waiting-modifier', 4.2, copy.beats.waiting, 0)],
    }),
    defineBeat({
      id: 'fire-modified-pulse', captionKey: copy.beats.delivered, flow: 'impact',
      cues: [
        timedCue('dismiss-carrier-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-carrier-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-carrier-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'carrierTarget' },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-carrier-hit', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'signal-slowed', moduleId: 'frost', captureAs: 'carrierHit' },
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-carrier-hit', 0.5, { actions: [{ type: 'set-tower-casting', enabled: false }] }),
      ],
    }),
    defineBeat({
      id: 'show-delivered-modifier', captionKey: copy.beats.delivered, flow: 'impact',
      cues: [timedCue('point-delivered-modifier', 4.2, {
        transitionDuration: 1.1, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.delivered, target: { signalRef: 'carrierHit' } },
        requireSignalState: { signalRef: 'carrierHit', alive: true, slowed: true },
      })],
    }),
    defineBeat({
      id: 'finish-carrier', captionKey: copy.sections.carry, flow: 'observe',
      cues: [
        timedCue('restore-carrier-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-carrier-clear', { waitForClear: true, waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
        timedCue('settle-carrier-clear', 0.5, {
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 }, ease: 'smooth',
        }),
      ],
    }),
  ],
});
