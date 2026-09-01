import { defineSignal } from './define-signal';

export const SOLAR_SIGIL_HEALTH_REGEN_PER_SECOND = 14_400;

export const solarSignal = defineSignal({
  id: 'solar',
  stats: { health: 120, speed: 74, spawnDelay: 1.05, reward: 36, coreDamage: 5, radius: 25 },
  text: {
    nameKey: 'signals.solar', roleKey: 'signalArchive.signals.solar.role',
    descriptionKey: 'signalArchive.signals.solar.description', counterKey: 'signalArchive.signals.solar.counter',
  },
  visual: { color: '#e5ad22', geometry: 'hexagram', sides: 6, spin: 0.42, labelContrast: 'dark' },
  capabilities: [{ kind: 'health-regeneration', rate: SOLAR_SIGIL_HEALTH_REGEN_PER_SECOND }],
  archive: {
    ability: {
      labelKey: 'signalArchive.abilities.rapidRegeneration',
      detailKey: 'signalArchive.abilities.rapidRegenerationDetail',
      values: { regen: SOLAR_SIGIL_HEALTH_REGEN_PER_SECOND },
    },
  },
});
