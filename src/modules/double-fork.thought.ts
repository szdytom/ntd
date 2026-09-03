import { buildSplitProjectileThought } from '../thoughts/authoring';
import { doubleForkModule } from './double-fork';

export const doubleForkThought = buildSplitProjectileThought({
  module: doubleForkModule,
  seed: 79,
  count: 2,
  copy: {
    title: 'thoughts.doubleFork.title',
    summary: 'thoughts.doubleFork.summary',
    sectionSplit: 'thoughts.doubleFork.sections.split',
    sectionFocus: 'thoughts.doubleFork.sections.focus',
    beatSplit: 'thoughts.doubleFork.beats.split',
    beatLand: 'thoughts.doubleFork.beats.land',
    beatFocus: 'thoughts.doubleFork.beats.focus',
    beatFocusedHit: 'thoughts.doubleFork.beats.focusedHit',
  },
});
