import { defineSignal } from './define-signal';

export const radiantSignal = defineSignal({
  id: 'radiant',
  stats: { health: 390, speed: 30, spawnDelay: 1.4, reward: 46, coreDamage: 7, radius: 31 },
  text: {
    nameKey: 'signals.radiant', roleKey: 'signalArchive.signals.radiant.role',
    descriptionKey: 'signalArchive.signals.radiant.description', counterKey: 'signalArchive.signals.radiant.counter',
  },
  visual: { color: '#9aae18', geometry: 'ring', sides: 3, spin: -0.38, orbitNodes: 3 },
  capabilities: [{
    kind: 'tower-suppression-aura', radius: 290, cooldownMultiplier: 2, energyRegenMultiplier: 0.5,
    color: '#b7cc35', lightningColor: '#382347', lightningCoreColor: '#a78bfa',
  }],
  archive: {
    ability: {
      labelKey: 'signalArchive.abilities.suppression', detailKey: 'signalArchive.abilities.suppressionDetail',
      values: { radius: 290, cooldown: 2, regen: 50 },
    },
    demo: {
      initialMode: 'base',
      modes: [{
        id: 'suppressed-tower', actionKey: 'signalArchive.suppressedTower.show',
        restoreKey: 'signalArchive.suppressedTower.restore',
        specimen: { kind: 'tower-under-aura', capability: 'tower-suppression-aura' },
        profile: 'suppressed-tower',
        text: {
          nameKey: 'signalArchive.suppressedTower.name', roleKey: 'signalArchive.suppressedTower.role',
          descriptionKey: 'signalArchive.suppressedTower.description',
        },
      }],
    },
  },
});
