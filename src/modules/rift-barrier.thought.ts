import { buildStaticPayloadThought } from '../thoughts/authoring';
import { riftBarrierModule } from './rift-barrier';

const copy = {
  title: 'thoughts.riftBarrier.title',
  summary: 'thoughts.riftBarrier.summary',
  section: 'thoughts.riftBarrier.sections.rift',
  beatTrigger: 'thoughts.riftBarrier.beats.trigger',
  beatEffect: 'thoughts.riftBarrier.beats.effect',
} as const;

export const riftBarrierThought = buildStaticPayloadThought({
  module: riftBarrierModule,
  copy,
  seed: 131,
  carrier: 'pulse',
  effect: { type: 'signal-damaged', occurrence: 2 },
  effectTarget: { signalRef: 'target' },
  aliveRef: 'target',
});
