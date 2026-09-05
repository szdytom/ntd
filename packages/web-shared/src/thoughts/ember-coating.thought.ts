import { buildStatusModifierThought } from '../thoughts/authoring';
import { emberCoatingModule } from '@prism-bastion/game-core/modules/ember-coating';

const copy = {
  title: 'thoughts.emberCoating.title',
  summary: 'thoughts.emberCoating.summary',
  sectionDirect: 'thoughts.emberCoating.sections.direct',
  sectionArea: 'thoughts.emberCoating.sections.area',
  sectionStatic: 'thoughts.emberCoating.sections.static',
  beatCoat: 'thoughts.emberCoating.beats.coat',
  beatTick: 'thoughts.emberCoating.beats.tick',
  beatAreaAll: 'thoughts.emberCoating.beats.areaAll',
  beatStaticModifier: 'thoughts.emberCoating.beats.staticModifier',
  beatStaticAffects: 'thoughts.emberCoating.beats.staticAffects',
  beatStaticLater: 'thoughts.emberCoating.beats.staticLater',
} as const;

export const emberCoatingThought = buildStatusModifierThought({
  module: emberCoatingModule,
  copy,
  seed: 31,
  carrier: 'pulse',
  areaCarrier: 'nova',
});
