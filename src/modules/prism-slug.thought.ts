import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  introduceScene,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { straightRangePassScene } from '../thoughts/scenes';
import { prismSlugModule } from './prism-slug';

const copy = {
  title: 'thoughts.prismSlug.title',
  summary: 'thoughts.prismSlug.summary',
  sections: {
    hit: 'thoughts.prismSlug.sections.hit',
    carry: 'thoughts.prismSlug.sections.carry',
  },
  beats: {
    flight: 'thoughts.prismSlug.beats.flight',
    damage: 'thoughts.prismSlug.beats.damage',
    waiting: 'thoughts.prismSlug.beats.waiting',
    delivered: 'thoughts.prismSlug.beats.delivered',
  },
} as const;

export const prismSlugThought = defineModuleThought(prismSlugModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 47,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 1, signalSpeedScale: 0.92 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-slug', captionKey: copy.sections.hit, flow: 'compile',
      cues: introduceScene({ slots: ['prism-slug'] }),
    }),
    defineBeat({
      id: 'show-slug', captionKey: copy.sections.hit, flow: 'compile',
      cues: [timedCue('show-slug-loadout', 3.2, {
        sectionTitleKey: copy.sections.hit,
        overlay: { type: 'loadout', target: 'tower', placement: 'right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      })],
    }),
    defineBeat({
      id: 'launch-slug', captionKey: copy.beats.flight, flow: 'cast',
      cues: [
        timedCue('dismiss-slug-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-slug-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-slug-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 34 }, captureAs: 'slugTarget' },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-slug-launch', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'prism-slug', captureAs: 'slugShot' },
          timeout: 12, timelineWait: true,
        }),
      ],
    }),
    defineBeat({
      id: 'show-slug-flight', captionKey: copy.beats.flight, flow: 'cast',
      cues: [timedCue('point-slug-flight', 4.2, {
        transitionDuration: 0.18, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.flight, target: { projectileRef: 'slugShot' } },
      })],
    }),
    defineBeat({
      id: 'show-slug-damage', captionKey: copy.beats.damage, flow: 'impact',
      cues: [
        timedCue('restore-slug-flight', 0.65, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-slug-hit', {
          waitFor: { type: 'projectile-hit', moduleId: 'prism-slug', captureAs: 'slugHit' },
          timeout: 6, timelineWait: true,
        }),
        timedCue('settle-slug-hit', 0.5),
        timedCue('point-slug-damage', 4.2, {
          transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beats.damage, target: { signalRef: 'slugHit' } },
          requireSignalState: { signalRef: 'slugHit', alive: true },
        }),
      ],
    }),
    defineBeat({
      id: 'finish-slug-hit', captionKey: copy.sections.hit, flow: 'observe',
      cues: [
        timedCue('restore-slug-hit', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-slug-clear', { waitForClear: true, waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
        timedCue('settle-slug-clear', 0.5, { transition: { towerRotation: -Math.PI / 2 }, ease: 'smooth' }),
      ],
    }),
    defineBeat({
      id: 'construct-carrier', captionKey: copy.sections.carry, flow: 'compile',
      cues: [
        timedCue('dismiss-slug-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('configure-carrier', 0.2, {
          actions: [{ type: 'setup', slots: ['frost', 'prism-slug'] }],
          loadoutMode: 'hidden', transition: { signalOpacity: 0 },
        }),
        timedCue('show-carrier-slug', 1.15, {
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
      id: 'fire-modified-slug', captionKey: copy.beats.delivered, flow: 'impact',
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
        timedCue('settle-carrier-clear', 0.5, { transition: { towerRotation: -Math.PI / 2 }, ease: 'smooth' }),
      ],
    }),
  ],
});
