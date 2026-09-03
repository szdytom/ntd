import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  finishRun,
  fireCapturedRun,
  introduceScene,
  resetTo,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_LANE_CLEANUP, straightFiringLaneScene } from '../thoughts/scenes';
import { voidBeamModule } from './void-beam';

const copy = {
  title: 'thoughts.voidBeam.title',
  summary: 'thoughts.voidBeam.summary',
  sections: {
    pass: 'thoughts.voidBeam.sections.pass',
    trail: 'thoughts.voidBeam.sections.trail',
  },
  beats: {
    flight: 'thoughts.voidBeam.beats.flight',
    pass: 'thoughts.voidBeam.beats.pass',
    trail: 'thoughts.voidBeam.beats.trail',
    trailExtent: 'thoughts.voidBeam.beats.trailExtent',
  },
} as const;

export const voidBeamThought = defineModuleThought(voidBeamModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 73,
  scene: straightFiringLaneScene({ towerSlots: 2, signalHealthScale: 2, signalSpeedScale: 0.55 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-pass', captionKey: copy.sections.pass, flow: 'compile',
      cues: introduceScene({ slots: ['void-beam'] }),
    }),
    defineBeat({
      id: 'show-pass-loadout', captionKey: copy.sections.pass, flow: 'compile',
      cues: [timedCue('show-void-beam', 3.2, {
        sectionTitleKey: copy.sections.pass,
        overlay: { type: 'loadout', target: 'tower', placement: 'right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      })],
    }),
    defineBeat({
      id: 'launch-beam', captionKey: copy.beats.flight, flow: 'cast',
      cues: [
        timedCue('dismiss-beam-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-beam-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-pass-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'passTarget' },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-beam-launch', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'void-beam', captureAs: 'beam' },
          timeout: 12, timelineWait: true,
        }),
      ],
    }),
    defineBeat({
      id: 'show-beam-flight', captionKey: copy.beats.flight, flow: 'cast',
      cues: [timedCue('point-beam-flight', 4.2, {
        transitionDuration: 0.18, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.flight, target: { projectileRef: 'beam' } },
      })],
    }),
    defineBeat({
      id: 'travel-through-target', captionKey: copy.beats.pass, flow: 'cast',
      cues: [
        timedCue('resume-beam-flight', 0.8, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('beam-travel', {
          waitForProjectileStates: [{ projectileRef: 'beam', alive: true, minimumTravelDistance: 320 }],
          timeout: 6, timelineWait: true,
        }),
        timedCue('settle-beam-pass', 0.35),
      ],
    }),
    defineBeat({
      id: 'show-beam-pass', captionKey: copy.beats.pass, flow: 'cast',
      cues: [timedCue('point-beam-pass', 4.2, {
        transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.pass, target: { signalRef: 'passTarget' } },
        requireSignalState: { signalRef: 'passTarget', alive: true },
      })],
    }),
    defineBeat({
      id: 'construct-trail', captionKey: copy.sections.trail, flow: 'compile',
      cues: resetTo(
        'trail',
        ['cinder-trail', 'void-beam'],
        copy.sections.trail,
        1,
        'right',
        { start: 1, count: 1 },
      ),
    }),
    defineBeat({
      id: 'show-trail-loadout', captionKey: copy.beats.trail, flow: 'trail',
      cues: [
        timedCue('show-trail-beam', 2.45, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2,
        }),
        explainLoadoutSlot('point-trail-beam', 4.2, copy.beats.trail, 1),
      ],
    }),
    defineBeat({
      id: 'fire-trail-beam', captionKey: copy.beats.trailExtent, flow: 'trail',
      cues: fireCapturedRun('trail-beam', {
        carrier: 'void-beam',
        captureAs: 'trailBeam',
        inputs: [
          { signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 62 } },
          { signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 38 } },
          { signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 14 } },
        ],
        capture: { type: 'status-applied', occurrence: 2, captureAs: 'trailAffected' },
        captureTimeout: 10,
      }),
    }),
    defineBeat({
      id: 'show-trail-beam', captionKey: copy.beats.trailExtent, flow: 'trail',
      cues: [timedCue('point-trail-extent', 4.2, {
        transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.trailExtent, target: { trailRef: 'trailBeam', anchor: 'end' } },
      })],
    }),
    defineBeat({
      id: 'finish-trail-beam', captionKey: copy.sections.trail, flow: 'observe',
      cues: finishRun('finish-trail-beam', 0, STRAIGHT_LANE_CLEANUP),
    }),
  ],
});
