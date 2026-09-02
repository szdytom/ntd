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
import { emergencyBatteryModule } from './emergency-battery';

const copy = {
  title: 'thoughts.emergencyBattery.title',
  summary: 'thoughts.emergencyBattery.summary',
  section: 'thoughts.emergencyBattery.sections.supply',
  beatSupply: 'thoughts.emergencyBattery.beats.supply',
  beatCast: 'thoughts.emergencyBattery.beats.cast',
} as const;

export const emergencyBatteryThought = defineModuleThought(emergencyBatteryModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 193,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['emergency-battery', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatSupply, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatSupply, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatCast, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
        capture: { type: 'projectile-hit', moduleId: 'pulse' },
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
