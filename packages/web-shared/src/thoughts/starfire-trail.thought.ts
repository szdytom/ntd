import { buildTrailWakeThought } from '../thoughts/authoring';
import { starfireTrailModule } from '@prism-bastion/game-core/modules/starfire-trail';

const copy = {
  title: 'thoughts.starfireTrail.title',
  summary: 'thoughts.starfireTrail.summary',
  sectionWake: 'thoughts.starfireTrail.sections.wake',
  sectionCarrier: 'thoughts.starfireTrail.sections.carrier',
  beatSettle: 'thoughts.starfireTrail.beats.settle',
  beatAffect: 'thoughts.starfireTrail.beats.affect',
  beatStops: 'thoughts.starfireTrail.beats.stops',
  beatExtends: 'thoughts.starfireTrail.beats.extends',
} as const;

export const starfireTrailThought = buildTrailWakeThought({
  module: starfireTrailModule,
  copy,
  seed: 107,
  wake: { type: 'status-applied', occurrence: 1, captureAs: 'burned' },
  wakeTarget: { signalRef: 'burned' },
  wakeRef: 'burned',
});
