import { buildStatusModifierThought } from '../thoughts/authoring';
import { toxinModule } from '@prism-bastion/game-core/modules/toxin';

const copy = {
  title: 'thoughts.toxin.title',
  summary: 'thoughts.toxin.summary',
  sectionDirect: 'thoughts.toxin.sections.direct',
  sectionArea: 'thoughts.toxin.sections.area',
  sectionStatic: 'thoughts.toxin.sections.static',
  beatCoat: 'thoughts.toxin.beats.coat',
  beatTick: 'thoughts.toxin.beats.tick',
  beatAreaAll: 'thoughts.toxin.beats.areaAll',
  beatStaticModifier: 'thoughts.toxin.beats.staticModifier',
  beatStaticAffects: 'thoughts.toxin.beats.staticAffects',
  beatStaticLater: 'thoughts.toxin.beats.staticLater',
} as const;

export const toxinThought = buildStatusModifierThought({
  module: toxinModule,
  copy,
  seed: 37,
  carrier: 'pulse',
  areaCarrier: 'nova',
  staticCarrier: 'ember-field',
});
