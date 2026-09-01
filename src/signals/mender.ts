import { defineSignal } from './define-signal';

export const MENDER_OUT_OF_COMBAT_HEAL_DELAY = 2.5;

export const menderSignal = defineSignal({
  id: 'mender',
  stats: { health: 210, speed: 45, spawnDelay: 0.9, reward: 15, coreDamage: 3, radius: 21 },
  text: {
    nameKey: 'signals.mender', roleKey: 'signalArchive.signals.mender.role',
    descriptionKey: 'signalArchive.signals.mender.description', counterKey: 'signalArchive.signals.mender.counter',
  },
  visual: { color: '#d14f8f', geometry: 'polygon', sides: 7, innerOutline: true },
  capabilities: [{ kind: 'full-heal-after-lull', delay: MENDER_OUT_OF_COMBAT_HEAL_DELAY }],
  archive: {
    ability: {
      labelKey: 'signalArchive.abilities.fullHeal', detailKey: 'signalArchive.abilities.fullHealDetail',
      values: { delay: MENDER_OUT_OF_COMBAT_HEAL_DELAY },
    },
  },
});
