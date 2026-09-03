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
import { arcboltModule } from './arcbolt';

const copy = {
  title: 'thoughts.arcbolt.title',
  summary: 'thoughts.arcbolt.summary',
  sections: {
    chain: 'thoughts.arcbolt.sections.chain',
    modifier: 'thoughts.arcbolt.sections.modifier',
    focus: 'thoughts.arcbolt.sections.focus',
  },
  beats: {
    chain: 'thoughts.arcbolt.beats.chain',
    decay: 'thoughts.arcbolt.beats.decay',
    modifier: 'thoughts.arcbolt.beats.modifier',
    modifiedAll: 'thoughts.arcbolt.beats.modifiedAll',
    focus: 'thoughts.arcbolt.beats.focus',
    focusedHit: 'thoughts.arcbolt.beats.focusedHit',
  },
} as const;

const chainTargets = [
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 82 }, captureAs: 'chainDirect' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 60 }, captureAs: 'chainNear' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 38 }, captureAs: 'chainMid' },
  { signal: 'spark' as const, position: { type: 'tower-range-entry' as const, leadDistance: 16 }, captureAs: 'chainFar' },
];

export const arcboltThought = defineModuleThought(arcboltModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 61,
  scene: straightRangePassScene({ towerSlots: 2, signalHealthScale: 3, signalSpeedScale: 0.85 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-chain', captionKey: copy.sections.chain, flow: 'compile',
      cues: introduceScene({ slots: ['arcbolt'] }),
    }),
    defineBeat({
      id: 'show-chain-loadout', captionKey: copy.sections.chain, flow: 'compile',
      cues: [timedCue('show-arcbolt', 3.2, {
        sectionTitleKey: copy.sections.chain,
        overlay: { type: 'loadout', target: 'tower', placement: 'right' },
        loadoutMode: 'dialog', loadoutVisibleSlots: 1,
      })],
    }),
    defineBeat({
      id: 'fire-chain', captionKey: copy.beats.chain, flow: 'impact',
      cues: fireCapturedRun('chain', {
        carrier: 'arcbolt',
        inputs: chainTargets,
        capture: { type: 'secondary-hit', moduleId: 'arcbolt', occurrence: 3, captureAs: 'lastChain' },
      }),
    }),
    defineBeat({
      id: 'show-chain', captionKey: copy.beats.chain, flow: 'impact',
      cues: [showPause({ id: 'point-chain', captionKey: copy.beats.chain, target: { signalRef: 'lastChain' }, requireAlive: 'lastChain' })],
    }),
    defineBeat({
      id: 'show-chain-decay', captionKey: copy.beats.decay, flow: 'impact',
      cues: [timedCue('point-chain-decay', 4.2, {
        overlay: { type: 'caption', textKey: copy.beats.decay, target: { signalRef: 'chainFar' } },
        requireSignalState: { signalRef: 'chainFar', alive: true },
      })],
    }),
    defineBeat({
      id: 'construct-modifier', captionKey: copy.sections.modifier, flow: 'compile',
      cues: resetTo('modifier', ['frost', 'arcbolt'], copy.sections.modifier, 1),
    }),
    defineBeat({
      id: 'show-modifier-loadout', captionKey: copy.beats.modifier, flow: 'compile',
      cues: [
        timedCue('show-modified-arcbolt', 2.45, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2,
        }),
        explainLoadoutSlot('point-arcbolt-modifier', 4.2, copy.beats.modifier, 1),
      ],
    }),
    defineBeat({
      id: 'fire-modified-chain', captionKey: copy.beats.modifiedAll, flow: 'impact',
      cues: fireCapturedRun('modified-chain', {
        carrier: 'arcbolt',
        inputs: chainTargets,
        capture: { type: 'signal-slowed', moduleId: 'frost', occurrence: 4, captureAs: 'modifiedChainTarget' },
      }),
    }),
    defineBeat({
      id: 'show-modified-chain', captionKey: copy.beats.modifiedAll, flow: 'impact',
      cues: [timedCue('point-modified-chain', 4.2, {
        transitionDuration: 0.8, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.modifiedAll, target: { signalRef: 'modifiedChainTarget' } },
        requireSignalState: { signalRef: 'modifiedChainTarget', alive: true, slowed: true },
      })],
    }),
    defineBeat({
      id: 'construct-focus', captionKey: copy.sections.focus, flow: 'compile',
      cues: resetTo('focus', ['focus-core', 'arcbolt'], copy.sections.focus, 1),
    }),
    defineBeat({
      id: 'show-focus-loadout', captionKey: copy.beats.focus, flow: 'focus',
      cues: [
        timedCue('show-focused-arcbolt', 2.45, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' }, loadoutVisibleSlots: 2,
        }),
        explainLoadoutSlot('point-focused-arcbolt', 4.2, copy.beats.focus, 1),
      ],
    }),
    defineBeat({
      id: 'fire-focused-arcbolt', captionKey: copy.beats.focusedHit, flow: 'focus',
      cues: fireCapturedRun('focused-arcbolt', {
        carrier: 'arcbolt',
        inputs: [
          { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 60 }, captureAs: 'focusDirect' },
          { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 38 }, captureAs: 'focusNear' },
          { signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 16 } },
        ],
        capture: { type: 'projectile-hit', moduleId: 'arcbolt' },
      }),
    }),
    defineBeat({
      id: 'show-focused-hit', captionKey: copy.beats.focusedHit, flow: 'focus',
      cues: [showPause({ id: 'point-focus-neighbor', captionKey: copy.beats.focusedHit, target: { signalRef: 'focusNear' }, requireAlive: 'focusNear' })],
    }),
    defineBeat({
      id: 'finish-focus', captionKey: copy.sections.focus, flow: 'observe',
      cues: finishRun('finish-focus', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
