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
import { novaModule } from './nova';

const copy = {
  title: 'thoughts.nova.title',
  summary: 'thoughts.nova.summary',
  section: 'thoughts.nova.sections.blast',
  beatFlight: 'thoughts.nova.beats.flight',
  beatBlast: 'thoughts.nova.beats.blast',
} as const;

const targets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 70 }, captureAs: 'lead' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 52 }, captureAs: 'mid' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 34 }, captureAs: 'tail' },
];

export const novaThought = defineModuleThought(novaModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 53,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['nova'] }),
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
      id: 'fire', captionKey: copy.beatBlast, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'nova',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'nova' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatBlast, flow: 'impact',
      cues: [showPause({ id: 'point-blast', captionKey: copy.beatBlast, target: { signalRef: 'lead' }, requireAlive: 'lead' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
