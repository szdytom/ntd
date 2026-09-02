import { buildStatusModifierThought } from '../thoughts/authoring';
import { toxinModule } from './toxin';

const copy = {
  title: 'thoughts.toxin.title',
  summary: 'thoughts.toxin.summary',
  sectionDirect: 'thoughts.toxin.sections.direct',
  sectionArea: 'thoughts.toxin.sections.area',
  beatCoat: 'thoughts.toxin.beats.coat',
  beatTick: 'thoughts.toxin.beats.tick',
  beatAreaAll: 'thoughts.toxin.beats.areaAll',
} as const;

export const toxinThought = buildStatusModifierThought({
  module: toxinModule,
  copy,
  seed: 37,
  carrier: 'pulse',
  areaCarrier: 'nova',
});
