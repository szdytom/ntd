import { buildSplitProjectileThought } from '../thoughts/authoring';
import { forkModule } from '@prism-bastion/game-core/modules/fork';

export const forkThought = buildSplitProjectileThought({
  module: forkModule,
  seed: 83,
  count: 3,
  copy: {
    title: 'thoughts.fork.title',
    summary: 'thoughts.fork.summary',
    sectionSplit: 'thoughts.fork.sections.split',
    sectionGuidance: 'thoughts.fork.sections.guidance',
    sectionFocus: 'thoughts.fork.sections.focus',
    beatSplit: 'thoughts.fork.beats.split',
    beatLand: 'thoughts.fork.beats.land',
    beatGuidance: 'thoughts.fork.beats.guidance',
    beatGuidedHit: 'thoughts.fork.beats.guidedHit',
    beatFocus: 'thoughts.fork.beats.focus',
    beatFocusedHit: 'thoughts.fork.beats.focusedHit',
  },
});
