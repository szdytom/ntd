import { buildTrailWakeThought } from '../thoughts/authoring';
import { riftTrailModule } from './rift-trail';

const copy = {
  title: 'thoughts.riftTrail.title',
  summary: 'thoughts.riftTrail.summary',
  sectionWake: 'thoughts.riftTrail.sections.wake',
  sectionCarrier: 'thoughts.riftTrail.sections.carrier',
  beatSettle: 'thoughts.riftTrail.beats.settle',
  beatAffect: 'thoughts.riftTrail.beats.affect',
  beatStops: 'thoughts.riftTrail.beats.stops',
  beatExtends: 'thoughts.riftTrail.beats.extends',
} as const;

export const riftTrailThought = buildTrailWakeThought({
  module: riftTrailModule,
  copy,
  seed: 109,
  signalHealthScale: 8,
  wake: { type: 'signal-damaged', occurrence: 1, captureAs: 'riftHit' },
  wakeTarget: { signalRef: 'riftHit' },
  wakeRef: 'riftHit',
});
