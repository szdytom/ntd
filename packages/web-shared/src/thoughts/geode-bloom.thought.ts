import { buildAreaProjectileThought } from '../thoughts/authoring';
import { geodeBloomModule } from '@prism-bastion/game-core/modules/geode-bloom';

export const geodeBloomThought = buildAreaProjectileThought({
  module: geodeBloomModule,
  seed: 59,
  copy: {
    title: 'thoughts.geodeBloom.title',
    summary: 'thoughts.geodeBloom.summary',
    sectionBlast: 'thoughts.geodeBloom.sections.blast',
    sectionModifier: 'thoughts.geodeBloom.sections.modifier',
    sectionCondense: 'thoughts.geodeBloom.sections.condense',
    beatFlight: 'thoughts.geodeBloom.beats.flight',
    beatBlast: 'thoughts.geodeBloom.beats.blast',
    beatModifier: 'thoughts.geodeBloom.beats.modifier',
    beatModifiedAll: 'thoughts.geodeBloom.beats.modifiedAll',
    beatCondense: 'thoughts.geodeBloom.beats.condense',
    beatCondensedHit: 'thoughts.geodeBloom.beats.condensedHit',
  },
});
