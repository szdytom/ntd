import {
  defineBeat,
  defineModuleThought,
  explainLoadoutSlot,
  introduceScene,
  timedCue,
  waitCue,
} from '../thoughts/authoring';
import { straightRangePassScene } from '../thoughts/scenes';
import { focusCoreModule } from '@prism-bastion/game-core/modules/focus-core';

const copy = {
  title: 'thoughts.focusCore.title',
  summary: 'thoughts.focusCore.summary',
  sections: {
    count: 'thoughts.focusCore.sections.count',
    focusCount: 'thoughts.focusCore.sections.focusCount',
    focusChain: 'thoughts.focusCore.sections.focusChain',
    targets: 'thoughts.focusCore.sections.targets',
  },
  beats: {
    forked: 'thoughts.focusCore.beats.forked',
    consumeCount: 'thoughts.focusCore.beats.consumeCount',
    countResult: 'thoughts.focusCore.beats.countResult',
    consumeChain: 'thoughts.focusCore.beats.consumeChain',
    chainResult: 'thoughts.focusCore.beats.chainResult',
    solarMatch: 'thoughts.focusCore.beats.solarMatch',
    anvilMismatch: 'thoughts.focusCore.beats.anvilMismatch',
  },
} as const;

export const focusCoreThought = defineModuleThought(focusCoreModule, {
  titleKey: copy.title,
  summaryKey: copy.summary,
  seed: 31,
  scene: straightRangePassScene({ towerSlots: 3, signalHealthScale: 0.72, signalSpeedScale: 0.9 }),
  initialScene: { pathProgress: 0, towerPadOpacity: 0, towerOpacity: 0, signalOpacity: 0, simulationRate: 1 },
  beats: [
    defineBeat({
      id: 'construct-count', captionKey: copy.sections.count, flow: 'compile',
      cues: introduceScene({ slots: ['double-fork', 'pulse'] }),
    }),
    defineBeat({
      id: 'show-count-loadout', captionKey: copy.sections.count, flow: 'compile',
      cues: [
        timedCue('show-fork-module', 0.75, {
          sectionTitleKey: copy.sections.count,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
        }),
        timedCue('show-fork-carrier', 2.45, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleSlots: 2,
        }),
      ],
    }),
    defineBeat({
      id: 'fire-forked-pulse', captionKey: copy.beats.forked, flow: 'cast',
      cues: [
        timedCue('dismiss-fork-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-fork-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-fork-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 34 } },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-forked-projectiles', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'double-fork', captureAs: 'forkedProjectiles' },
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-forked-projectiles', 0.12, { actions: [{ type: 'set-tower-casting', enabled: false }] }),
      ],
    }),
    defineBeat({
      id: 'show-forked-projectiles', captionKey: copy.beats.forked, flow: 'cast',
      cues: [timedCue('point-forked-projectiles', 4.2, {
        transitionDuration: 0.18, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.forked, target: { projectileGroupRef: 'forkedProjectiles' } },
      })],
    }),
    defineBeat({
      id: 'finish-forked-projectiles', captionKey: copy.sections.count, flow: 'observe',
      cues: [
        timedCue('restore-forked-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-forked-clear', { waitForClear: true, waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
        timedCue('settle-forked-clear', 0.5, {
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 }, ease: 'smooth',
        }),
      ],
    }),
    defineBeat({
      id: 'construct-count-focus', captionKey: copy.sections.focusCount, flow: 'compile',
      cues: [
        timedCue('dismiss-fork-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('configure-count-focus', 0.2, {
          actions: [{ type: 'setup', slots: ['focus-core', 'double-fork', 'pulse'] }],
          loadoutMode: 'hidden', transition: { signalOpacity: 0 },
        }),
        timedCue('show-count-before-focus', 1, {
          sectionTitleKey: copy.sections.focusCount,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleRange: { start: 1, count: 2 },
        }),
        timedCue('insert-count-focus', 2.4, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleRange: { start: 0, count: 3 },
        }),
      ],
    }),
    defineBeat({
      id: 'explain-count-focus', captionKey: copy.beats.consumeCount, flow: 'focus',
      cues: [explainLoadoutSlot('point-count-focus', 4.2, copy.beats.consumeCount, 0)],
    }),
    defineBeat({
      id: 'fire-count-focus', captionKey: copy.beats.countResult, flow: 'focus',
      cues: [
        timedCue('dismiss-count-focus', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-count-focus', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-count-focus-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'kite', position: { type: 'tower-range-entry', leadDistance: 34 } },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-count-focus-projectile', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'focus-core', captureAs: 'countFocusProjectile' },
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-count-focus-projectile', 0.1, { actions: [{ type: 'set-tower-casting', enabled: false }] }),
      ],
    }),
    defineBeat({
      id: 'show-count-focus-result', captionKey: copy.beats.countResult, flow: 'focus',
      cues: [timedCue('point-count-focus-result', 4.2, {
        transitionDuration: 0.15, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.countResult, target: { projectileRef: 'countFocusProjectile' } },
      })],
    }),
    defineBeat({
      id: 'finish-count-focus', captionKey: copy.sections.focusCount, flow: 'observe',
      cues: [
        timedCue('restore-count-focus-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-count-focus-clear', { waitForClear: true, waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
        timedCue('settle-count-focus-clear', 0.5, {
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 }, ease: 'smooth',
        }),
      ],
    }),
    defineBeat({
      id: 'construct-chain', captionKey: copy.sections.focusChain, flow: 'compile',
      cues: [
        timedCue('dismiss-count-focus-compact', 0.35, { loadoutMode: 'compact-leaving' }),
        timedCue('configure-chain', 0.2, {
          actions: [{ type: 'setup', slots: ['arcbolt'] }],
          loadoutMode: 'hidden', transition: { signalOpacity: 0 },
        }),
        timedCue('show-chain-loadout', 3.2, {
          sectionTitleKey: copy.sections.focusChain,
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleSlots: 1,
          animateLoadoutChanges: true,
        }),
      ],
    }),
    defineBeat({
      id: 'fire-chain', captionKey: copy.sections.focusChain, flow: 'impact',
      cues: [
        timedCue('dismiss-chain-loadout', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-chain-loadout', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-chain-targets', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 76 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 52 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 28 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 4 } },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-chain-hit', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'secondary-hit', moduleId: 'arcbolt' },
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-chain-hit', 0.05),
      ],
    }),
    defineBeat({
      id: 'prepare-chain-focus', captionKey: copy.sections.focusChain, flow: 'compile',
      cues: [
        timedCue('restore-chain-time', 1.1, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-chain-clear', { waitForClear: true, waitForTowerEnergy: true, timeout: 20, timelineWait: true }),
        timedCue('dismiss-chain-compact', 0.35, {
          loadoutMode: 'compact-leaving',
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 },
          ease: 'smooth',
        }),
        timedCue('configure-chain-focus', 0.2, {
          actions: [{ type: 'setup', slots: ['focus-core', 'arcbolt'] }],
          loadoutMode: 'hidden', transition: { signalOpacity: 0 }, ease: 'smooth',
        }),
        timedCue('show-chain-before-focus', 1, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutMode: 'dialog', loadoutVisibleRange: { start: 1, count: 1 },
        }),
        timedCue('insert-chain-focus', 2.4, {
          overlay: { type: 'loadout', target: 'tower', placement: 'right' },
          loadoutVisibleRange: { start: 0, count: 2 },
        }),
      ],
    }),
    defineBeat({
      id: 'explain-chain-focus', captionKey: copy.beats.consumeChain, flow: 'focus',
      cues: [explainLoadoutSlot('point-chain-focus', 4.2, copy.beats.consumeChain, 0)],
    }),
    defineBeat({
      id: 'fire-chain-focus', captionKey: copy.beats.chainResult, flow: 'focus',
      cues: [
        timedCue('dismiss-chain-focus', 0.45, { loadoutMode: 'dialog-leaving' }),
        timedCue('compact-chain-focus', 0.35, { loadoutMode: 'compact' }),
        timedCue('spawn-chain-focus-targets', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 76 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 52 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 28 } },
            { type: 'spawn-signal', signal: 'spark', position: { type: 'tower-range-entry', leadDistance: 4 } },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        waitCue('wait-chain-focus-projectile', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-spawned', moduleId: 'focus-core', captureAs: 'chainFocusProjectile' },
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-chain-focus-projectile', 0.08, { actions: [{ type: 'set-tower-casting', enabled: false }] }),
      ],
    }),
    defineBeat({
      id: 'show-chain-focus-result', captionKey: copy.beats.chainResult, flow: 'focus',
      cues: [timedCue('point-chain-focus-result', 4.2, {
        transitionDuration: 0.12, transition: { simulationRate: 0 }, ease: 'smooth',
        overlay: { type: 'caption', textKey: copy.beats.chainResult, target: { projectileRef: 'chainFocusProjectile' } },
      })],
    }),
    defineBeat({
      id: 'finish-chain-focus', captionKey: copy.sections.focusChain, flow: 'observe',
      cues: [
        timedCue('restore-chain-focus-time', 1.35, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-chain-focus-clear', { waitForClear: true, waitForTowerEnergy: true, timeout: 30, timelineWait: true }),
        timedCue('settle-chain-focus-clear', 0.5, {
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 }, ease: 'smooth',
        }),
      ],
    }),
    defineBeat({
      id: 'introduce-focus-targets', captionKey: copy.beats.solarMatch, flow: 'focus',
      cues: [
        timedCue('configure-target-comparison', 0.2, {
          actions: [{ type: 'setup', slots: ['focus-core', 'arcbolt'] }],
          sectionTitleKey: copy.sections.targets,
          loadoutMode: 'compact',
          transition: { signalOpacity: 0 },
        }),
        timedCue('spawn-solar-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            {
              type: 'spawn-signal', signal: 'solar', captureAs: 'solarTarget',
              position: { type: 'tower-range-entry', leadDistance: 42 },
            },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
        timedCue('point-solar-match', 4.2, {
          overlay: { type: 'caption', textKey: copy.beats.solarMatch, target: { signalRef: 'solarTarget' } },
          requireSignalState: { signalRef: 'solarTarget', alive: true },
        }),
      ],
    }),
    defineBeat({
      id: 'replace-solar-with-anvil', captionKey: copy.beats.anvilMismatch, flow: 'observe',
      cues: [
        waitCue('wait-solar-defeated', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitForSignalStates: [{ signalRef: 'solarTarget', alive: false }],
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-solar-defeat', 0.5, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 }, ease: 'smooth',
        }),
        timedCue('configure-anvil-comparison', 0.2, {
          actions: [{ type: 'setup', slots: ['focus-core', 'arcbolt'] }],
          loadoutMode: 'compact',
          transition: { signalOpacity: 0 },
        }),
        timedCue('spawn-anvil-target', 0.7, {
          actions: [
            { type: 'set-tower-casting', enabled: false },
            {
              type: 'spawn-signal', signal: 'anvil', captureAs: 'anvilTarget',
              position: { type: 'tower-range-entry', leadDistance: 42 },
            },
          ],
          transition: { signalOpacity: 1 }, ease: 'ease-out',
        }),
      ],
    }),
    defineBeat({
      id: 'show-anvil-mismatch', captionKey: copy.beats.anvilMismatch, flow: 'observe',
      cues: [
        waitCue('wait-anvil-hit', {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          waitFor: { type: 'projectile-hit', moduleId: 'focus-core', captureAs: 'anvilHit' },
          timeout: 12, timelineWait: true,
        }),
        timedCue('settle-anvil-hit', 0.08, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
        }),
        timedCue('point-anvil-mismatch', 4.2, {
          transitionDuration: 0.12, transition: { simulationRate: 0 }, ease: 'smooth',
          overlay: { type: 'caption', textKey: copy.beats.anvilMismatch, target: { signalRef: 'anvilHit' } },
          requireSignalState: { signalRef: 'anvilHit', alive: true },
        }),
      ],
    }),
    defineBeat({
      id: 'finish-target-comparison', captionKey: copy.sections.targets, flow: 'observe',
      cues: [
        timedCue('restore-target-comparison', 0.8, {
          actions: [{ type: 'set-tower-casting', enabled: true }],
          transition: { simulationRate: 1 }, ease: 'smooth',
        }),
        waitCue('wait-anvil-target-clear', {
          waitForSignalsOutOfRange: true, timeout: 20, timelineWait: true,
        }),
        timedCue('fade-anvil-target', 0.5, {
          actions: [{ type: 'set-tower-casting', enabled: false }],
          transition: { signalOpacity: 0 }, ease: 'ease-out',
        }),
        timedCue('delete-anvil-target', 0.1, {
          actions: [{ type: 'delete-signals' }],
        }),
        waitCue('wait-target-comparison-energy', {
          waitForTowerEnergy: true, timeout: 20, timelineWait: true,
        }),
        timedCue('settle-target-comparison', 0.5, {
          transition: { towerRotation: -Math.PI / 2, towerEnergyRatio: 1 }, ease: 'smooth',
        }),
      ],
    }),
  ],
});
