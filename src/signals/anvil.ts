import { defineSignal } from './define-signal';

export const anvilSignal = defineSignal({
  id: 'anvil',
  stats: { health: 480, speed: 26, spawnDelay: 1.5, reward: 50, coreDamage: 8, radius: 34 },
  text: {
    nameKey: 'signals.anvil', roleKey: 'signalArchive.signals.anvil.role',
    descriptionKey: 'signalArchive.signals.anvil.description', counterKey: 'signalArchive.signals.anvil.counter',
  },
  visual: { color: '#b88a35', geometry: 'anvil', sides: 5, spin: 0.55 },
  capabilities: [{ kind: 'damage-cap', damageCap: 6, continuousDamageCapPerSecond: 24 }],
  archive: {
    ability: {
      labelKey: 'signalArchive.abilities.layeredArmor', detailKey: 'signalArchive.abilities.layeredArmorDetail',
      values: { cap: 6 },
    },
  },
});
