import { buildRepeatThought } from '../thoughts/authoring';
import { barrageModule } from '@prism-bastion/game-core/modules/barrage';

export const barrageThought = buildRepeatThought({
  module: barrageModule,
  seed: 179,
  casts: 4,
  copy: {
    title: 'thoughts.barrage.title',
    summary: 'thoughts.barrage.summary',
    sectionRepeat: 'thoughts.barrage.sections.rapid',
    sectionStack: 'thoughts.barrage.sections.stack',
    sectionFocus: 'thoughts.barrage.sections.focus',
    beatRepeat: 'thoughts.barrage.beats.rapid',
    beatVolley: 'thoughts.barrage.beats.volley',
    beatEnergy: 'thoughts.barrage.beats.energy',
    beatStack: 'thoughts.barrage.beats.stack',
    beatMultiplied: 'thoughts.barrage.beats.multiplied',
    beatFocus: 'thoughts.barrage.beats.focus',
    beatFocusedHit: 'thoughts.barrage.beats.focusedHit',
  },
});
