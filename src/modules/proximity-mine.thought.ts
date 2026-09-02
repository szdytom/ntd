import { buildStaticPayloadThought } from '../thoughts/authoring';
import { proximityMineModule } from './proximity-mine';

const copy = {
  title: 'thoughts.proximityMine.title',
  summary: 'thoughts.proximityMine.summary',
  section: 'thoughts.proximityMine.sections.detonate',
  beatTrigger: 'thoughts.proximityMine.beats.trigger',
  beatEffect: 'thoughts.proximityMine.beats.effect',
} as const;

export const proximityMineThought = buildStaticPayloadThought({
  module: proximityMineModule,
  copy,
  seed: 127,
  carrier: 'pulse',
  effect: { type: 'signal-damaged', occurrence: 2 },
  effectTarget: { signalRef: 'target' },
  aliveRef: 'target',
});
