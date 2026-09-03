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
import { overdriveModule } from './overdrive';

const copy = {
  title: 'thoughts.overdrive.title',
  summary: 'thoughts.overdrive.summary',
  section: 'thoughts.overdrive.sections.empower',
  beatEmpower: 'thoughts.overdrive.beats.empower',
  beatHit: 'thoughts.overdrive.beats.hit',
} as const;

export const overdriveThought = defineModuleThought(overdriveModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 89,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 1.4, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct', captionKey: copy.section, flow: 'compile',
      cues: introduceScene({ slots: ['overdrive', 'pulse'] }),
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
      id: 'explain', captionKey: copy.beatEmpower, flow: 'compile',
      cues: [explainLoadoutSlot('point-mod', 4.2, copy.beatEmpower, 0)],
    }),
    defineBeat({
      id: 'fire', captionKey: copy.beatHit, flow: 'impact',
      cues: fireCapturedRun('fire', {
        carrier: 'pulse',
        inputs: [{ signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 44 }, captureAs: 'target' }],
        capture: { type: 'projectile-hit', moduleId: 'pulse', captureAs: 'hit' },
      }),
    }),
    defineBeat({
      id: 'show', captionKey: copy.beatHit, flow: 'impact',
      cues: [showPause({ id: 'point-hit', captionKey: copy.beatHit, target: { signalRef: 'target' }, requireAlive: 'target' })],
    }),
    defineBeat({
      id: 'finish', captionKey: copy.section, flow: 'observe',
      cues: finishRun('finish', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
