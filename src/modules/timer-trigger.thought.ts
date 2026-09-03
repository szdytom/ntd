import { buildDeferredTriggerThought } from '../thoughts/authoring';
import { timerTriggerModule } from './timer-trigger';

export const timerTriggerThought = buildDeferredTriggerThought({
  module: timerTriggerModule,
  seed: 157,
  copy: {
    title: 'thoughts.timerTrigger.title',
    summary: 'thoughts.timerTrigger.summary',
    sectionPrimary: 'thoughts.timerTrigger.sections.timer',
    sectionCollision: 'thoughts.timerTrigger.sections.collision',
    sectionShield: 'thoughts.timerTrigger.sections.shield',
    beatTrigger: 'thoughts.timerTrigger.beats.trigger',
    beatPayload: 'thoughts.timerTrigger.beats.payload',
    beatPrimary: 'thoughts.timerTrigger.beats.release',
    beatCollision: 'thoughts.timerTrigger.beats.collision',
    beatShield: 'thoughts.timerTrigger.beats.shield',
  },
});
