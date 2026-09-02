import { buildTrailWakeThought } from '../thoughts/authoring';
import { resonantTrailModule } from './resonant-trail';

const copy = {
  title: 'thoughts.resonantTrail.title',
  summary: 'thoughts.resonantTrail.summary',
  section: 'thoughts.resonantTrail.sections.wave',
  beatSettle: 'thoughts.resonantTrail.beats.settle',
  beatAffect: 'thoughts.resonantTrail.beats.affect',
} as const;

export const resonantTrailThought = buildTrailWakeThought({
  module: resonantTrailModule,
  copy,
  seed: 113,
  carrier: 'void-beam',
  wake: { type: 'signal-damaged', occurrence: 2, captureAs: 'pulse' },
  wakeTarget: { signalRef: 'target' },
  wakeRef: 'target',
});
