import { defineSignal } from './define-signal';

export const crownSignal = defineSignal({
  id: 'crown',
  stats: { health: 420, speed: 31, spawnDelay: 1.4, reward: 52, coreDamage: 8, radius: 29, boss: true },
  text: {
    nameKey: 'signals.crown', roleKey: 'signalArchive.signals.crown.role',
    descriptionKey: 'signalArchive.signals.crown.description', counterKey: 'signalArchive.signals.crown.counter',
  },
  visual: { color: '#ff774d', geometry: 'polygon', sides: 8, innerOutline: true, crownOrbit: true, deathEffectScale: 1.8 },
  capabilities: [{ kind: 'shield', capacity: 240, regen: 4, cooldown: 9, radius: 72, sides: 6, rotation: Math.PI / 6, color: '#45b7ff' }],
  archive: {
    ability: {
      labelKey: 'signalArchive.abilities.shield', detailKey: 'signalArchive.abilities.shieldDetail',
      values: { capacity: 240, regen: 4, cooldown: 9 },
    },
  },
});
