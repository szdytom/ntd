import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  finishRun,
  fireCapturedRun,
  introduceScene,
  resetTo,
  showPause,
  timedCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { colossusModule } from './colossus';

const copy = {
  title: 'thoughts.colossus.title',
  summary: 'thoughts.colossus.summary',
  section: 'thoughts.colossus.sections.enlarge',
  sectionCondense: 'thoughts.colossus.sections.condense',
  beatEnlarge: 'thoughts.colossus.beats.enlarge',
  beatBlast: 'thoughts.colossus.beats.blast',
  beatCondense: 'thoughts.colossus.beats.condense',
  beatCondensedHit: 'thoughts.colossus.beats.condensedHit',
} as const;

const targets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 60 }, captureAs: 'direct' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 42 }, captureAs: 'near' },
];

export const colossusThought = defineModuleThought(colossusModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 101,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['colossus', 'nova'] }),
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
        carrier: 'nova',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'nova' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatBlast, flow: 'impact',
      cues: [showPause({ id: 'point-blast', captionKey: copy.beatBlast, target: { signalRef: 'direct' }, requireAlive: 'direct' })],
    }),
    defineBeat({
      id: 'construct-condense', captionKey: copy.sectionCondense, flow: 'compile',
      cues: resetTo('condense', ['condense-core', 'colossus', 'nova'], copy.sectionCondense, 1),
    }),
    defineBeat({
      id: 'show-condense', captionKey: copy.beatCondense, flow: 'focus',
      cues: [
        timedCue('show-condensed-colossus', 2.45, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 3,
        }),
        explainLoadoutSlot('point-condensed-colossus', 4.2, copy.beatCondense, 1),
      ],
    }),
    defineBeat({
      id: 'fire-condensed-colossus', captionKey: copy.beatCondensedHit, flow: 'impact',
      cues: fireCapturedRun('condensed-colossus', {
        carrier: 'nova',
        inputs: [
          { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 60 }, captureAs: 'condenseNeighbor' },
          { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 42 } },
        ],
        capture: { type: 'projectile-hit', moduleId: 'nova' },
      }),
    }),
    defineBeat({
      id: 'show-condensed-colossus', captionKey: copy.beatCondensedHit, flow: 'impact',
      cues: [showPause({ id: 'point-condense-neighbor', captionKey: copy.beatCondensedHit, target: { signalRef: 'condenseNeighbor' }, requireAlive: 'condenseNeighbor' })],
    }),
    defineBeat({
      id: 'finish-condense', captionKey: copy.sectionCondense, flow: 'observe',
      cues: finishRun('finish-condense', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
