import { defineSignal } from './define-signal';

export const hexSignal = defineSignal({
  id: 'hex',
  stats: { health: 235, speed: 43, spawnDelay: 0.86, reward: 14, coreDamage: 3, radius: 21 },
  text: {
    nameKey: 'signals.hex', roleKey: 'signalArchive.signals.hex.role',
    descriptionKey: 'signalArchive.signals.hex.description', counterKey: 'signalArchive.signals.hex.counter',
  },
  visual: { color: '#7257fa', geometry: 'polygon', sides: 6, innerOutline: true },
  capabilities: [],
  archive: { ability: { labelKey: 'signalArchive.abilities.standard', detailKey: 'signalArchive.abilities.standardDetail' } },
});
