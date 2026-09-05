import { buildExpirationTriggerThought } from '../thoughts/authoring';
import { expirationTriggerModule } from '@prism-bastion/game-core/modules/expiration-trigger';

export const expirationTriggerThought = buildExpirationTriggerThought({
  module: expirationTriggerModule,
  seed: 163,
  copy: {
    title: 'thoughts.expirationTrigger.title',
    summary: 'thoughts.expirationTrigger.summary',
    sectionExpire: 'thoughts.expirationTrigger.sections.end',
    sectionShield: 'thoughts.expirationTrigger.sections.shield',
    beatTrigger: 'thoughts.expirationTrigger.beats.trigger',
    beatPayload: 'thoughts.expirationTrigger.beats.payload',
    beatFinalHit: 'thoughts.expirationTrigger.beats.finalHit',
    beatShield: 'thoughts.expirationTrigger.beats.shield',
  },
});
