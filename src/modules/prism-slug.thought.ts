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
import { prismSlugModule } from './prism-slug';

const copy = {
  title: 'thoughts.prismSlug.title',
  summary: 'thoughts.prismSlug.summary',
  section: 'thoughts.prismSlug.sections.strike',
  beatFlight: 'thoughts.prismSlug.beats.flight',
  beatSingle: 'thoughts.prismSlug.beats.single',
} as const;

export const prismSlugThought = defineModuleThought(prismSlugModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 47,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['prism-slug'] }),
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
      id: 'fire', captionKey: copy.beatSingle, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'prism-slug',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
        capture: { type: 'projectile-hit', moduleId: 'prism-slug', captureAs: 'hit' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatSingle, flow: 'impact',
      cues: [showPause({ id: 'point-hit', captionKey: copy.beatSingle, target: { signalRef: 'target' }, requireAlive: 'target' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
