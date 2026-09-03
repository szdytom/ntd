import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  finishRun,
  fireCapturedRun,
  introduceScene,
  showPause,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { voidBeamModule } from './void-beam';

const copy = {
  title: 'thoughts.voidBeam.title',
  summary: 'thoughts.voidBeam.summary',
  section: 'thoughts.voidBeam.sections.pass',
  beatFlight: 'thoughts.voidBeam.beats.flight',
  beatPass: 'thoughts.voidBeam.beats.pass',
} as const;

export const voidBeamThought = defineModuleThought(voidBeamModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 73,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 1, signalSpeedScale: 0.55 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['void-beam'] }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.section, flow: 'compile',
      cues: [timedCue('show-module', 0.75, {
        sectionTitleKey: copy.section,
        overlay: { type: 'loadout', target: 'tower', placement: 'right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      })],
    }),
    defineBeat({
      id: 'explain', captionKey: copy.beatFlight, flow: 'compile',
      cues: [explainLoadoutSlot('point-module', 4.2, copy.beatFlight, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatPass, flow: 'cast',
      cues: [
        ...fireCapturedRun('fire', {
          carrier: 'void-beam',
          inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'passTarget' }],
          captureAs: 'beam',
        }),
        waitCue('beam-travel', {
          waitForProjectileStates: [{ projectileRef: 'beam', alive: true, minimumTravelDistance: 320 }],
          timeout: 6,
          timelineWait: true,
        }),
      ],
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatPass, flow: 'cast',
      cues: [showPause({ id: 'point-pass', captionKey: copy.beatPass, target: { signalRef: 'passTarget' }, requireAlive: 'passTarget' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
