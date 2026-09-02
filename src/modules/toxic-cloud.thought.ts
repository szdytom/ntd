import { buildStaticPayloadThought } from '../thoughts/authoring';
import { toxicCloudModule } from './toxic-cloud';

const copy = {
  title: 'thoughts.toxicCloud.title',
  summary: 'thoughts.toxicCloud.summary',
  section: 'thoughts.toxicCloud.sections.corrode',
  beatTrigger: 'thoughts.toxicCloud.beats.trigger',
  beatEffect: 'thoughts.toxicCloud.beats.effect',
} as const;

export const toxicCloudThought = buildStaticPayloadThought({
  module: toxicCloudModule,
  copy,
  seed: 149,
  carrier: 'pulse',
  effect: { type: 'status-applied', occurrence: 1, captureAs: 'corroded' },
  effectTarget: { signalRef: 'corroded' },
  aliveRef: 'corroded',
});
