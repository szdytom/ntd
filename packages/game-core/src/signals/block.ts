import { defineSignal } from './define-signal';

export const blockSignal = defineSignal({
  id: 'block',
  stats: { health: 125, speed: 53, spawnDelay: 0.72, reward: 8, coreDamage: 2, radius: 17 },
  text: {
    nameKey: 'signals.block', roleKey: 'signalArchive.signals.block.role',
    descriptionKey: 'signalArchive.signals.block.description', counterKey: 'signalArchive.signals.block.counter',
  },
  visual: { color: '#20c997', geometry: 'polygon', sides: 4 },
  capabilities: [],
  archive: { ability: { labelKey: 'signalArchive.abilities.standard', detailKey: 'signalArchive.abilities.standardDetail' } },
});
