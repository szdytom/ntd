import { buildTrailWakeThought } from '../thoughts/authoring';
import { riftTrailModule } from './rift-trail';

const copy = {
  title: 'thoughts.riftTrail.title',
  summary: 'thoughts.riftTrail.summary',
  section: 'thoughts.riftTrail.sections.wake',
  beatSettle: 'thoughts.riftTrail.beats.settle',
  beatAffect: 'thoughts.riftTrail.beats.affect',
} as const;

export const riftTrailThought = buildTrailWakeThought({
  module: riftTrailModule,
  copy,
  seed: 109,
  carrier: 'void-beam',
  wake: { type: 'signal-damaged', occurrence: 1, captureAs: 'riftHit' },
  wakeTarget: { signalRef: 'target' },
  wakeRef: 'target',
});
