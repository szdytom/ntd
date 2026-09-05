import { buildAreaProjectileThought } from '../thoughts/authoring';
import { novaModule } from '@prism-bastion/game-core/modules/nova';

export const novaThought = buildAreaProjectileThought({
  module: novaModule,
  seed: 53,
  copy: {
    title: 'thoughts.nova.title',
    summary: 'thoughts.nova.summary',
    sectionBlast: 'thoughts.nova.sections.blast',
    sectionModifier: 'thoughts.nova.sections.modifier',
    sectionCondense: 'thoughts.nova.sections.condense',
    beatFlight: 'thoughts.nova.beats.flight',
    beatBlast: 'thoughts.nova.beats.blast',
    beatModifier: 'thoughts.nova.beats.modifier',
    beatModifiedAll: 'thoughts.nova.beats.modifiedAll',
    beatCondense: 'thoughts.nova.beats.condense',
    beatCondensedHit: 'thoughts.nova.beats.condensedHit',
  },
});
