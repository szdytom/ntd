import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  finishRun,
  fireCapturedRun,
  introduceScene,
  settleTowerForReset,
  showPause,
  timedCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { condenseCoreModule } from './condense-core';

const copy = {
  title: 'thoughts.condenseCore.title',
  summary: 'thoughts.condenseCore.summary',
  sectionSpread: 'thoughts.condenseCore.sections.spread',
  sectionConcentrate: 'thoughts.condenseCore.sections.concentrate',
  beatBlast: 'thoughts.condenseCore.beats.blast',
  beatConcentrate: 'thoughts.condenseCore.beats.concentrate',
  beatDirect: 'thoughts.condenseCore.beats.direct',
} as const;

const targets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 60 }, captureAs: 'direct' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 44 }, captureAs: 'near' },
];

export const condenseCoreThought = defineModuleThought(condenseCoreModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 103,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-nova', captionKey: copy.sectionSpread, flow: 'compile',
      cues: introduceScene({ slots: ['nova'] }),
    }),
    defineBeat({
      id: 'show-nova', captionKey: copy.sectionSpread, flow: 'compile',
      cues: [timedCue('show-nova', 0.75, {
        sectionTitleKey: copy.sectionSpread,
        overlay: { type: 'loadout', target: 'tower', placement: 'right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      })],
    }),
    defineBeat({
      id: 'fire-nova', captionKey: copy.beatBlast, flow: 'impact',
      cues: fireCapturedRun('nova', {
        carrier: 'nova',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'nova' },
      }),
    }),
    defineBeat({
      id: 'show-nova-blast', captionKey: copy.beatBlast, flow: 'impact',
      cues: [showPause({ id: 'point-blast', captionKey: copy.beatBlast, target: { signalRef: 'near' }, requireAlive: 'near' })],
    }),
    defineBeat({
      id: 'configure-condense', captionKey: copy.sectionConcentrate, flow: 'compile',
      cues: [
        timedCue('restore-blast-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        timedCue('fade-blast-targets', 0.5, { transition: { signalOpacity: 0 }, ease: 'ease-out' }),
        timedCue('dismiss-blast-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        settleTowerForReset('settle-blast-rotation'),
        timedCue('configure-condense-loadout', 0.2, {
          actions: [{ type: 'setup', slots: ['condense-core', 'nova'] }],
          loadoutMode: 'hidden',
        }),
        timedCue('show-nova-before-condense', 1.15, {
          sectionTitleKey: copy.sectionConcentrate,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleRange: { start: 1, count: 1 },
        }),
        timedCue('insert-condense-core', 2.5, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleRange: { start: 0, count: 2 },
        }),
      ],
    }),
    defineBeat({
      id: 'explain-condense', captionKey: copy.beatConcentrate, flow: 'compile',
      cues: [explainLoadoutSlot('point-condense', 4.2, copy.beatConcentrate, 0)],
    }),
    defineBeat({
      id: 'fire-condense', captionKey: copy.beatDirect, flow: 'impact',
      cues: fireCapturedRun('condense', {
        carrier: 'nova',
        inputs: targets,
        capture: { type: 'projectile-hit', moduleId: 'nova' },
      }),
    }),
    defineBeat({
      id: 'show-condense-result', captionKey: copy.beatDirect, flow: 'impact',
      cues: [showPause({ id: 'point-direct', captionKey: copy.beatDirect, target: { signalRef: 'direct' }, requireAlive: 'direct' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.sectionConcentrate, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
