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
import { razorModule } from './razor';

const copy = {
  title: 'thoughts.razor.title',
  summary: 'thoughts.razor.summary',
  section: 'thoughts.razor.sections.cut',
  beatFlight: 'thoughts.razor.beats.flight',
  beatCut: 'thoughts.razor.beats.cut',
} as const;

const targets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 70 }, captureAs: 'direct' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 52 }, captureAs: 'mid' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 34 }, captureAs: 'tail' },
];

export const razorThought = defineModuleThought(razorModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 67,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['razor'] }),
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
      id: 'fire', captionKey: copy.beatCut, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'razor',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'razor', occurrence: 2 },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatCut, flow: 'impact',
      cues: [showPause({ id: 'point-cut', captionKey: copy.beatCut, target: { signalRef: 'direct' }, requireAlive: 'direct' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
