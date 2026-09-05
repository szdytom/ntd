import { defineSignal } from './define-signal';

export const kiteSignal = defineSignal({
  id: 'kite',
  stats: { health: 62, speed: 74, spawnDelay: 0.58, reward: 5, coreDamage: 1, radius: 15 },
  text: {
    nameKey: 'signals.kite', roleKey: 'signalArchive.signals.kite.role',
    descriptionKey: 'signalArchive.signals.kite.description', counterKey: 'signalArchive.signals.kite.counter',
  },
  visual: { color: '#ff6b9d', geometry: 'polygon', sides: 4, rotationOffset: Math.PI / 4 },
  capabilities: [],
  archive: { ability: { labelKey: 'signalArchive.abilities.standard', detailKey: 'signalArchive.abilities.standardDetail' } },
});
