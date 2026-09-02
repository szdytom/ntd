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
import { straightRangePassScene } from '../thoughts/scenes';
import { economizerModule } from './economizer';

const copy = {
  title: 'thoughts.economizer.title',
  summary: 'thoughts.economizer.summary',
  section: 'thoughts.economizer.sections.economize',
  beatEconomize: 'thoughts.economizer.beats.economize',
  beatCast: 'thoughts.economizer.beats.cast',
} as const;

export const economizerThought = defineModuleThought(economizerModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 191,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['economizer', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatEconomize, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatEconomize, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatCast, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
        capture: { type: 'projectile-hit', moduleId: 'pulse' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatCast, flow: 'impact',
      cues: [showPause({ id: 'point-cast', captionKey: copy.beatCast, target: { signalRef: 'target' }, requireAlive: 'target' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2),
    }),
  ],
});
