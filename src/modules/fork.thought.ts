import { buildSplitProjectileThought } from '../thoughts/authoring';
import { forkModule } from './fork';

export const forkThought = buildSplitProjectileThought({
  module: forkModule,
  seed: 83,
  count: 3,
  copy: {
    title: 'thoughts.fork.title',
    summary: 'thoughts.fork.summary',
    sectionSplit: 'thoughts.fork.sections.split',
    sectionFocus: 'thoughts.fork.sections.focus',
    beatSplit: 'thoughts.fork.beats.split',
    beatLand: 'thoughts.fork.beats.land',
    beatFocus: 'thoughts.fork.beats.focus',
    beatFocusedHit: 'thoughts.fork.beats.focusedHit',
  },
});
