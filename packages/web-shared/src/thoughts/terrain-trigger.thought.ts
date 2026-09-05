import { buildDeferredTriggerThought } from '../thoughts/authoring';
import { terrainTriggerModule } from '@prism-bastion/game-core/modules/terrain-trigger';

export const terrainTriggerThought = buildDeferredTriggerThought({
  module: terrainTriggerModule,
  seed: 167,
  copy: {
    title: 'thoughts.terrainTrigger.title',
    summary: 'thoughts.terrainTrigger.summary',
    sectionPrimary: 'thoughts.terrainTrigger.sections.terrain',
    sectionCollision: 'thoughts.terrainTrigger.sections.collision',
    sectionShield: 'thoughts.terrainTrigger.sections.shield',
    beatTrigger: 'thoughts.terrainTrigger.beats.trigger',
    beatPayload: 'thoughts.terrainTrigger.beats.payload',
    beatPrimary: 'thoughts.terrainTrigger.beats.release',
    beatCollision: 'thoughts.terrainTrigger.beats.collision',
    beatShield: 'thoughts.terrainTrigger.beats.shield',
  },
});
