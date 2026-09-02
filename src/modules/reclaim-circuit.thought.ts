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
import { reclaimCircuitModule } from './reclaim-circuit';

const copy = {
  title: 'thoughts.reclaimCircuit.title',
  summary: 'thoughts.reclaimCircuit.summary',
  section: 'thoughts.reclaimCircuit.sections.refund',
  beatRefund: 'thoughts.reclaimCircuit.beats.refund',
  beatCast: 'thoughts.reclaimCircuit.beats.cast',
} as const;

export const reclaimCircuitThought = defineModuleThought(reclaimCircuitModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 197,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['reclaim-circuit', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatRefund, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatRefund, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatCast, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
        capture: { type: 'tower-energy-changed', occurrence: 2 },
        captureTimeout: 12,
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatCast, flow: 'impact',
      cues: [showPause({ id: 'point-cast', captionKey: copy.beatCast, target: { signalRef: 'target' }, requireAlive: 'target' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2),
    }),
  ],
});
