import { defineSignal } from './define-signal';

export const fractureSignal = defineSignal({
  id: 'fracture',
  stats: { health: 360, speed: 35, spawnDelay: 1.35, reward: 32, coreDamage: 7, radius: 32 },
  text: {
    nameKey: 'signals.fracture', roleKey: 'signalArchive.signals.fracture.role',
    descriptionKey: 'signalArchive.signals.fracture.description', counterKey: 'signalArchive.signals.fracture.counter',
  },
  visual: { color: '#00a8cc', geometry: 'fracture', sides: 4, spin: 0.55, deathEffectScale: 1.8 },
  capabilities: [{
    kind: 'split-on-death', count: 3, childVariantId: 'fracture-fragment', healthScale: 0.3,
    speedScale: 1.35, rewardScale: 0.25, coreDamageScale: 0.34, radiusScale: 0.58,
    spacing: 25, delay: 0.14, rippleDuration: 0.46, effectColor: '#73e7f2',
  }],
  variants: [{
    id: 'fracture-fragment',
    text: {
      nameKey: 'signalArchive.fragments.name', roleKey: 'signalArchive.fragments.role',
      descriptionKey: 'signalArchive.fragments.description',
    },
  }],
  archive: {
    ability: {
      labelKey: 'signalArchive.abilities.split', detailKey: 'signalArchive.abilities.splitDetail',
      values: { count: 3, health: 30, speed: 135 },
    },
    demo: {
      initialMode: 'base',
      modes: [{
        id: 'fragments', actionKey: 'signalArchive.fragments.show', restoreKey: 'signalArchive.fragments.restore',
        specimen: { kind: 'split-result', capability: 'split-on-death' }, profile: 'split-child',
        text: {
          nameKey: 'signalArchive.fragments.name', roleKey: 'signalArchive.fragments.role',
          descriptionKey: 'signalArchive.fragments.description',
        },
      }],
    },
  },
});
