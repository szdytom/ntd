import { buildTrailWakeThought } from '../thoughts/authoring';
import { resonantTrailModule } from '@prism-bastion/game-core/modules/resonant-trail';

const copy = {
  title: 'thoughts.resonantTrail.title',
  summary: 'thoughts.resonantTrail.summary',
  sectionWake: 'thoughts.resonantTrail.sections.wave',
  sectionCarrier: 'thoughts.resonantTrail.sections.carrier',
  beatSettle: 'thoughts.resonantTrail.beats.settle',
  beatAffect: 'thoughts.resonantTrail.beats.affect',
  beatStops: 'thoughts.resonantTrail.beats.stops',
  beatExtends: 'thoughts.resonantTrail.beats.extends',
} as const;

export const resonantTrailThought = buildTrailWakeThought({
  module: resonantTrailModule,
  copy,
  seed: 113,
  signalHealthScale: 8,
  wake: { type: 'signal-damaged', occurrence: 2, captureAs: 'pulse' },
  wakeTarget: { signalRef: 'pulse' },
  wakeRef: 'pulse',
  comparisonTargets: {
    stops: { signalRef: 'comparisonNovaHit' },
    extends: { signalRef: 'comparisonRazorHit' },
  },
});
