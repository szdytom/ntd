import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  finishRun,
  fireCapturedRun,
  introduceScene,
  showPause,
  timedCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { seekerModule } from './seeker';

const copy = {
  title: 'thoughts.seeker.title',
  summary: 'thoughts.seeker.summary',
  section: 'thoughts.seeker.sections.hone',
  beatHone: 'thoughts.seeker.beats.hone',
  beatTrack: 'thoughts.seeker.beats.track',
} as const;

export const seekerThought = defineModuleThought(seekerModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 181,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 4, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['seeker', 'pulse'] }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.section, flow: 'compile',
      cues: [
        timedCue('show-mod', 0.75, {
          sectionTitleKey: copy.section,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        }),
        timedCue('show-carrier', 0.6, { overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2 }),
      ],
    }),
    defineBeat({
      id: 'explain', captionKey: copy.beatHone, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatHone, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatTrack, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
        capture: { type: 'projectile-hit', moduleId: 'pulse' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatTrack, flow: 'impact',
      cues: [showPause({ id: 'point-track', captionKey: copy.beatTrack, target: { signalRef: 'target' }, requireAlive: 'target' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
