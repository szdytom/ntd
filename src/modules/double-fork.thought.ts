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
import { doubleForkModule } from './double-fork';

const copy = {
  title: 'thoughts.doubleFork.title',
  summary: 'thoughts.doubleFork.summary',
  section: 'thoughts.doubleFork.sections.split',
  beatSplit: 'thoughts.doubleFork.beats.split',
  beatLand: 'thoughts.doubleFork.beats.land',
} as const;

const targets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 78 }, captureAs: 'first' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 46 }, captureAs: 'second' },
];

export const doubleForkThought = defineModuleThought(doubleForkModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 79,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['double-fork', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatSplit, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatSplit, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatLand, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'pulse', occurrence: 2 },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatLand, flow: 'impact',
      cues: [showPause({ id: 'point-land', captionKey: copy.beatLand, target: { signalRef: 'first' }, requireAlive: 'first' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2),
    }),
  ],
});
