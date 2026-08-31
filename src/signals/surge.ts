import { defineSignal } from './define-signal';

export const surgeSignal = defineSignal({
  id: 'surge',
  stats: { health: 24, speed: 95, spawnDelay: 0.5, reward: 4, coreDamage: 1, radius: 15 },
  text: {
    nameKey: 'signals.surge',
    roleKey: 'signalArchive.signals.surge.role',
    descriptionKey: 'signalArchive.signals.surge.description',
    counterKey: 'signalArchive.signals.surge.counter',
  },
  visual: { color: '#3d8bfd', geometry: 'surge', sides: 4 },
  capabilities: [{ kind: 'pulse-movement', cycle: 1.3, peakSpeedMultiplier: 5.25, wavePower: 8 }],
  archive: {
    ability: {
      labelKey: 'signalArchive.abilities.waveAdvance',
      detailKey: 'signalArchive.abilities.waveAdvanceDetail',
      values: { cycle: 1.3, multiplier: 5.25, power: 8, speed: 95 },
    },
  },
});
