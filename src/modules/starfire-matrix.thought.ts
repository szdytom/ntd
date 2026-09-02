import { buildStatusModifierThought } from '../thoughts/authoring';
import { starfireMatrixModule } from './starfire-matrix';

const copy = {
  title: 'thoughts.starfireMatrix.title',
  summary: 'thoughts.starfireMatrix.summary',
  sectionDirect: 'thoughts.starfireMatrix.sections.direct',
  sectionArea: 'thoughts.starfireMatrix.sections.area',
  beatCoat: 'thoughts.starfireMatrix.beats.coat',
  beatTick: 'thoughts.starfireMatrix.beats.tick',
  beatAreaAll: 'thoughts.starfireMatrix.beats.areaAll',
} as const;

export const starfireMatrixThought = buildStatusModifierThought({
  module: starfireMatrixModule,
  copy,
  seed: 43,
  carrier: 'pulse',
  areaCarrier: 'nova',
});
