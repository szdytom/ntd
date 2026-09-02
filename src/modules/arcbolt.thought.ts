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
import { arcboltModule } from './arcbolt';

const copy = {
  title: 'thoughts.arcbolt.title',
  summary: 'thoughts.arcbolt.summary',
  section: 'thoughts.arcbolt.sections.chain',
  beatFlight: 'thoughts.arcbolt.beats.flight',
  beatChain: 'thoughts.arcbolt.beats.chain',
} as const;

const targets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 70 }, captureAs: 'direct' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 52 }, captureAs: 'near' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 34 }, captureAs: 'far' },
];

export const arcboltThought = defineModuleThought(arcboltModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 61,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['arcbolt'] }),
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
      id: 'fire', captionKey: copy.beatChain, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'arcbolt',
        inputs: targets,
        capture: { type: 'secondary-hit', moduleId: 'arcbolt', occurrence: 2, captureAs: 'chain' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatChain, flow: 'impact',
      cues: [showPause({ id: 'point-chain', captionKey: copy.beatChain, target: { signalRef: 'chain' }, requireAlive: 'chain' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2),
    }),
  ],
});
