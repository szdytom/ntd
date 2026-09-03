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
import { STRAIGHT_LANE_CLEANUP, straightFiringLaneScene } from '../thoughts/scenes';
import { needleModule } from './needle';

const copy = {
  title: 'thoughts.needle.title',
  summary: 'thoughts.needle.summary',
  section: 'thoughts.needle.sections.pierce',
  beatFlight: 'thoughts.needle.beats.flight',
  beatPierce: 'thoughts.needle.beats.pierce',
} as const;

const targets = [
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0 }, captureAs: 'first' },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.03 }, captureAs: 'second' },
  { signal: 'spark' as const, position: { type: 'route-progress' as const, progress: 0.06 }, captureAs: 'third' },
];

export const needleThought = defineModuleThought(needleModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 71,
  scene: straightFiringLaneScene({ towerSlots: 3, signalHealthScale: 2, signalSpeedScale: 0.9 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['needle'] }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.section, flow: 'compile',
      cues: [timedCue('show-module', 0.75, {
        sectionTitleKey: copy.section,
        overlay: { type: 'loadout', target: 'tower', placement: 'top-right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      })],
    }),
    defineBeat({
      id: 'explain', captionKey: copy.beatFlight, flow: 'compile',
      cues: [explainLoadoutSlot('point-module', 4.2, copy.beatFlight, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatPierce, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'needle',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'needle', occurrence: 3, captureAs: 'pierced' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatPierce, flow: 'impact',
      cues: [showPause({ id: 'point-pierce', captionKey: copy.beatPierce, target: { signalRef: 'first' }, requireAlive: 'first' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', 0, STRAIGHT_LANE_CLEANUP),
    }),
  ],
});
