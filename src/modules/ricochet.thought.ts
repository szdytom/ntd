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
import { ricochetModule } from './ricochet';

const copy = {
  title: 'thoughts.ricochet.title',
  summary: 'thoughts.ricochet.summary',
  section: 'thoughts.ricochet.sections.bounce',
  beatBounce: 'thoughts.ricochet.beats.bounce',
  beatRedirect: 'thoughts.ricochet.beats.redirect',
} as const;

const targets = [
  { signal: 'kite' as const, position: { type: 'tower-range-entry' as const, leadDistance: 52 }, captureAs: 'first' },
  { signal: 'kite' as const, position: { type: 'tower-range-entry' as const, leadDistance: 34 }, captureAs: 'second' },
  { signal: 'kite' as const, position: { type: 'tower-range-entry' as const, leadDistance: 16 }, captureAs: 'third' },
];

export const ricochetThought = defineModuleThought(ricochetModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 97,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 1.4, signalSpeedScale: 0.75 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['ricochet', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatBounce, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatBounce, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatRedirect, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'pulse', occurrence: 3 },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatRedirect, flow: 'impact',
      cues: [showPause({ id: 'point-redirect', captionKey: copy.beatRedirect, target: { signalRef: 'first' }, requireAlive: 'first' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
