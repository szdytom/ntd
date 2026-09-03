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
import { echoModule } from './echo';

const copy = {
  title: 'thoughts.echo.title',
  summary: 'thoughts.echo.summary',
  section: 'thoughts.echo.sections.repeat',
  beatRepeat: 'thoughts.echo.beats.repeat',
  beatSecond: 'thoughts.echo.beats.second',
} as const;

export const echoThought = defineModuleThought(echoModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 173,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 4, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['echo', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatRepeat, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatRepeat, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatSecond, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
        capture: { type: 'projectile-spawned', moduleId: 'pulse', occurrence: 2 },
        captureTimeout: 10,
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatSecond, flow: 'impact',
      cues: [showPause({ id: 'point-repeat', captionKey: copy.beatSecond, target: { signalRef: 'target' }, requireAlive: 'target' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
