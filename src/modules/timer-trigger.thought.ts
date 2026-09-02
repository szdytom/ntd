import { buildTriggerThought } from '../thoughts/authoring';
import { timerTriggerModule } from './timer-trigger';

const copy = {
  title: 'thoughts.timerTrigger.title',
  summary: 'thoughts.timerTrigger.summary',
  section: 'thoughts.timerTrigger.sections.timer',
  beatTrigger: 'thoughts.timerTrigger.beats.trigger',
  beatRelease: 'thoughts.timerTrigger.beats.release',
} as const;

export const timerTriggerThought = buildTriggerThought({
  module: timerTriggerModule,
  copy,
  seed: 157,
});
