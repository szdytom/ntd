import { buildStaticPayloadThought } from '../thoughts/authoring';
import { emberFieldModule } from './ember-field';

const copy = {
  title: 'thoughts.emberField.title',
  summary: 'thoughts.emberField.summary',
  section: 'thoughts.emberField.sections.burn',
  beatTrigger: 'thoughts.emberField.beats.trigger',
  beatEffect: 'thoughts.emberField.beats.effect',
} as const;

export const emberFieldThought = buildStaticPayloadThought({
  module: emberFieldModule,
  copy,
  seed: 139,
  carrier: 'pulse',
  effect: { type: 'status-applied', occurrence: 1, captureAs: 'burned' },
  effectTarget: { signalRef: 'burned' },
  aliveRef: 'burned',
});
