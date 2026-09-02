import { buildStaticPayloadThought } from '../thoughts/authoring';
import { teslaNodeModule } from './tesla-node';

const copy = {
  title: 'thoughts.teslaNode.title',
  summary: 'thoughts.teslaNode.summary',
  section: 'thoughts.teslaNode.sections.shock',
  beatTrigger: 'thoughts.teslaNode.beats.trigger',
  beatEffect: 'thoughts.teslaNode.beats.effect',
} as const;

export const teslaNodeThought = buildStaticPayloadThought({
  module: teslaNodeModule,
  copy,
  seed: 137,
  carrier: 'pulse',
  effect: { type: 'signal-damaged', occurrence: 2 },
  effectTarget: { signalRef: 'target' },
  aliveRef: 'target',
});
