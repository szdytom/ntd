import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  finishRun,
  introduceScene,
  LOADOUT_ADDITION_CADENCE,
  openRun,
  settleTowerForReset,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { STRAIGHT_RANGE_CLEANUP, straightRangePassScene } from '../thoughts/scenes';
import { reclaimCircuitModule } from '@prism-bastion/game-core/modules/reclaim-circuit';

const copy = {
  title: 'thoughts.reclaimCircuit.title',
  summary: 'thoughts.reclaimCircuit.summary',
  sections: {
    cluster: 'thoughts.reclaimCircuit.sections.cluster',
    shield: 'thoughts.reclaimCircuit.sections.shield',
  },
  beats: {
    attach: 'thoughts.reclaimCircuit.beats.attach',
    collect: 'thoughts.reclaimCircuit.beats.collect',
    return: 'thoughts.reclaimCircuit.beats.return',
    absorbed: 'thoughts.reclaimCircuit.beats.absorbed',
    blocked: 'thoughts.reclaimCircuit.beats.blocked',
  },
} as const;

const durableTargets = [96, 68, 40, 12].map((leadDistance, index) => ({
  signal: 'block' as const,
  position: { type: 'tower-range-entry' as const, leadDistance },
  captureAs: `durableTarget${index}`,
}));

export const reclaimCircuitThought = defineModuleThought(reclaimCircuitModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 197,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 1, signalSpeedScale: 1 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-cluster', captionKey: copy.sections.cluster, flow: 'compile',
      cues: introduceScene({ slots: ['reclaim-circuit', 'colossus', 'nova'] }),
    }),
    defineBeat({
      id: 'show-cluster-loadout', captionKey: copy.sections.cluster, flow: 'compile',
      cues: [
        timedCue('show-reclaim-circuit', LOADOUT_ADDITION_CADENCE, {
          sectionTitleKey: copy.sections.cluster,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        }),
        timedCue('show-reclaim-amplifier', LOADOUT_ADDITION_CADENCE, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleSlots: 2,
        }),
        timedCue('show-reclaim-carrier', 2.45, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleSlots: 3,
        }),
      ],
    }),
    defineBeat({
      id: 'explain-reclaim', captionKey: copy.beats.attach, flow: 'compile',
      cues: [explainLoadoutSlot('point-reclaim-circuit', 4.2, copy.beats.attach, 0)],
    }),
    defineBeat({
      id: 'fire-durable-cluster', captionKey: copy.sections.cluster, flow: 'impact',
      cues: [
        ...openRun('durable-cluster'),
        timedCue('spawn-durable-cluster', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            ...durableTargets.map((target) => ({ type: 'spawn-signal' as const, ...target })),
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-durable-nova-launch', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'nova' },
          timeout: 12, timelineWait: true,
        }),
        waitCue('wait-durable-refunds', {
          waitFor: { type: 'tower-energy-changed', occurrence: 5 },
          timeout: 8, timelineWait: true,
        }),
        timedCue('settle-durable-refunds', 0.25, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-collected-damage', captionKey: copy.beats.collect, flow: 'impact',
      cues: [timedCue('point-durable-cluster', 4.2, {
        transitionDuration: 0.6, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.collect, target: { signalRef: 'durableTarget1' } },
        requireSignalState: { signalRef: 'durableTarget1', alive: true },
      })],
    }),
    defineBeat({
      id: 'show-energy-return', captionKey: copy.beats.return, flow: 'observe',
      cues: [timedCue('point-cluster-refund', 4.2, {
        overlay: { type: 'caption', textKey: copy.beats.return, target: { towerIndex: 0 } },
      })],
    }),
    defineBeat({
      id: 'prepare-shield-test', captionKey: copy.sections.shield, flow: 'observe',
      cues: [
        timedCue('resume-durable-cluster', 0.8, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-durable-cluster-clear', {
          waitForSignalsPastNode: STRAIGHT_RANGE_CLEANUP,
          timeout: 20, timelineWait: true,
        }),
        timedCue('fade-durable-cluster', 0.5, {
          transition: { signalOpacity: 0 }, ease: 'ease-out',
        }),
        timedCue('delete-durable-cluster', 0.2, {
          actions: [{ type: 'delete-signals' }],
        }),
        waitCue('wait-durable-energy', {
          waitForTowerEnergy: true, timeout: 20, timelineWait: true,
        }),
        settleTowerForReset('settle-durable-tower'),
        timedCue('configure-shield-test', 0.2, {
          actions: [{ type: 'setup', slots: ['reclaim-circuit', 'colossus', 'nova'] }],
          sectionTitleKey: copy.sections.shield,
          loadoutMode: 'compact',
          transition: { signalOpacity: 0 },
        }),
      ],
    }),
    defineBeat({
      id: 'fire-at-shield', captionKey: copy.sections.shield, flow: 'impact',
      cues: [
        timedCue('spawn-shield-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            {
              type: 'spawn-signal', signal: 'crown', captureAs: 'shieldTarget',
              position: { type: 'tower-range-entry', leadDistance: 44 },
            },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-shield-nova-launch', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'nova' },
          timeout: 12, timelineWait: true,
        }),
        waitCue('wait-shield-absorb', {
          waitFor: { type: 'projectile-absorbed', moduleId: 'nova' },
          timeout: 8, timelineWait: true,
        }),
        timedCue('settle-shield-absorb', 0.25, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
      ],
    }),
    defineBeat({
      id: 'show-shield-absorption', captionKey: copy.beats.absorbed, flow: 'impact',
      cues: [timedCue('point-shield-absorb', 4.2, {
        transitionDuration: 0.6, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.absorbed, target: { signalRef: 'shieldTarget' } },
        requireSignalState: { signalRef: 'shieldTarget', alive: true },
      })],
    }),
    defineBeat({
      id: 'show-blocked-return', captionKey: copy.beats.blocked, flow: 'observe',
      cues: [timedCue('point-shield-no-return', 4.2, {
        overlay: { type: 'caption', textKey: copy.beats.blocked, target: { towerIndex: 0 } },
      })],
    }),
    defineBeat({
      id: 'finish-shield-test', captionKey: copy.sections.shield, flow: 'observe',
      cues: finishRun('finish-shield', -Math.PI / 2, STRAIGHT_RANGE_CLEANUP),
    }),
  ],
});
