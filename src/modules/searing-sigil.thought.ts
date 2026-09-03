import { buildStatusModifierThought } from '../thoughts/authoring';
import { searingSigilModule } from './searing-sigil';

const copy = {
  title: 'thoughts.searingSigil.title',
  summary: 'thoughts.searingSigil.summary',
  sectionDirect: 'thoughts.searingSigil.sections.direct',
  sectionArea: 'thoughts.searingSigil.sections.area',
  sectionStatic: 'thoughts.searingSigil.sections.static',
  beatCoat: 'thoughts.searingSigil.beats.coat',
  beatTick: 'thoughts.searingSigil.beats.tick',
  beatAreaAll: 'thoughts.searingSigil.beats.areaAll',
  beatStaticModifier: 'thoughts.searingSigil.beats.staticModifier',
  beatStaticAffects: 'thoughts.searingSigil.beats.staticAffects',
  beatStaticLater: 'thoughts.searingSigil.beats.staticLater',
} as const;

export const searingSigilThought = buildStatusModifierThought({
  module: searingSigilModule,
  copy,
  seed: 41,
  carrier: 'pulse',
  areaCarrier: 'nova',
});
