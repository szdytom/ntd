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
import { colossusModule } from './colossus';

const copy = {
  title: 'thoughts.colossus.title',
  summary: 'thoughts.colossus.summary',
  section: 'thoughts.colossus.sections.enlarge',
  beatEnlarge: 'thoughts.colossus.beats.enlarge',
  beatBlast: 'thoughts.colossus.beats.blast',
} as const;

const targets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 60 }, captureAs: 'direct' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 42 }, captureAs: 'near' },
];

export const colossusThought = defineModuleThought(colossusModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 101,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['colossus', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatEnlarge, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatEnlarge, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatBlast, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'pulse' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatBlast, flow: 'impact',
      cues: [showPause({ id: 'point-blast', captionKey: copy.beatBlast, target: { signalRef: 'direct' }, requireAlive: 'direct' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2),
    }),
  ],
});
