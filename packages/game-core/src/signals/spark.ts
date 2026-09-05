import { defineSignal } from './define-signal';

export const sparkSignal = defineSignal({
  id: 'spark',
  stats: { health: 28, speed: 105, spawnDelay: 0.42, reward: 3, coreDamage: 1, radius: 13 },
  text: {
    nameKey: 'signals.spark',
    roleKey: 'signalArchive.signals.spark.role',
    descriptionKey: 'signalArchive.signals.spark.description',
    counterKey: 'signalArchive.signals.spark.counter',
  },
  visual: { color: '#ffcf4a', geometry: 'polygon', sides: 3, rotationOffset: Math.PI / 2, labelContrast: 'dark' },
  capabilities: [],
  archive: { ability: { labelKey: 'signalArchive.abilities.standard', detailKey: 'signalArchive.abilities.standardDetail' } },
});
