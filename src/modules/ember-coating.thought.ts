import { buildStatusModifierThought } from '../thoughts/authoring';
import { emberCoatingModule } from './ember-coating';

const copy = {
  title: 'thoughts.emberCoating.title',
  summary: 'thoughts.emberCoating.summary',
  sectionDirect: 'thoughts.emberCoating.sections.direct',
  sectionArea: 'thoughts.emberCoating.sections.area',
  beatCoat: 'thoughts.emberCoating.beats.coat',
  beatTick: 'thoughts.emberCoating.beats.tick',
  beatAreaAll: 'thoughts.emberCoating.beats.areaAll',
} as const;

export const emberCoatingThought = buildStatusModifierThought({
  module: emberCoatingModule,
  copy,
  seed: 31,
  carrier: 'pulse',
  areaCarrier: 'nova',
});
