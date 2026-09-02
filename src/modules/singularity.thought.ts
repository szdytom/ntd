import { buildStaticPayloadThought } from '../thoughts/authoring';
import { singularityModule } from './singularity';

const copy = {
  title: 'thoughts.singularity.title',
  summary: 'thoughts.singularity.summary',
  section: 'thoughts.singularity.sections.pull',
  beatTrigger: 'thoughts.singularity.beats.trigger',
  beatEffect: 'thoughts.singularity.beats.effect',
} as const;

export const singularityThought = buildStaticPayloadThought({
  module: singularityModule,
  copy,
  seed: 151,
  carrier: 'pulse',
  observe: 1.5,
  effectTarget: { signalRef: 'target' },
  aliveRef: 'target',
});
