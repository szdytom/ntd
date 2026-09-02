import { buildTriggerThought } from '../thoughts/authoring';
import { expirationTriggerModule } from './expiration-trigger';

const copy = {
  title: 'thoughts.expirationTrigger.title',
  summary: 'thoughts.expirationTrigger.summary',
  section: 'thoughts.expirationTrigger.sections.end',
  beatTrigger: 'thoughts.expirationTrigger.beats.trigger',
  beatRelease: 'thoughts.expirationTrigger.beats.release',
} as const;

export const expirationTriggerThought = buildTriggerThought({
  module: expirationTriggerModule,
  copy,
  seed: 163,
});
