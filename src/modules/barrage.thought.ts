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
import { barrageModule } from './barrage';

const copy = {
  title: 'thoughts.barrage.title',
  summary: 'thoughts.barrage.summary',
  section: 'thoughts.barrage.sections.rapid',
  beatRapid: 'thoughts.barrage.beats.rapid',
  beatVolley: 'thoughts.barrage.beats.volley',
} as const;

export const barrageThought = defineModuleThought(barrageModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 179,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 4, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['barrage', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatRapid, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatRapid, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatVolley, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
        capture: { type: 'projectile-spawned', moduleId: 'pulse', occurrence: 3 },
        captureTimeout: 10,
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatVolley, flow: 'impact',
      cues: [showPause({ id: 'point-volley', captionKey: copy.beatVolley, target: { signalRef: 'target' }, requireAlive: 'target' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2),
    }),
  ],
});
