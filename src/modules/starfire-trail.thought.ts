import { buildTrailWakeThought } from '../thoughts/authoring';
import { starfireTrailModule } from './starfire-trail';

const copy = {
  title: 'thoughts.starfireTrail.title',
  summary: 'thoughts.starfireTrail.summary',
  section: 'thoughts.starfireTrail.sections.wake',
  beatSettle: 'thoughts.starfireTrail.beats.settle',
  beatAffect: 'thoughts.starfireTrail.beats.affect',
} as const;

export const starfireTrailThought = buildTrailWakeThought({
  module: starfireTrailModule,
  copy,
  seed: 107,
  carrier: 'void-beam',
  wake: { type: 'status-applied', occurrence: 1, captureAs: 'burned' },
  wakeTarget: { signalRef: 'burned' },
  wakeRef: 'burned',
});
