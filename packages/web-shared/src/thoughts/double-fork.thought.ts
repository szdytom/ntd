import { buildSplitProjectileThought } from '../thoughts/authoring';
import { doubleForkModule } from '@prism-bastion/game-core/modules/double-fork';

export const doubleForkThought = buildSplitProjectileThought({
  module: doubleForkModule,
  seed: 79,
  count: 2,
  copy: {
    title: 'thoughts.doubleFork.title',
    summary: 'thoughts.doubleFork.summary',
    sectionSplit: 'thoughts.doubleFork.sections.split',
    sectionGuidance: 'thoughts.doubleFork.sections.guidance',
    sectionFocus: 'thoughts.doubleFork.sections.focus',
    beatSplit: 'thoughts.doubleFork.beats.split',
    beatLand: 'thoughts.doubleFork.beats.land',
    beatGuidance: 'thoughts.doubleFork.beats.guidance',
    beatGuidedHit: 'thoughts.doubleFork.beats.guidedHit',
    beatFocus: 'thoughts.doubleFork.beats.focus',
    beatFocusedHit: 'thoughts.doubleFork.beats.focusedHit',
  },
});
