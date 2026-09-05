import { buildPiercingProjectileThought } from '../thoughts/authoring';
import { razorModule } from '@prism-bastion/game-core/modules/razor';

export const razorThought = buildPiercingProjectileThought({
  module: razorModule,
  seed: 67,
  hitOccurrence: 3,
  copy: {
    title: 'thoughts.razor.title',
    summary: 'thoughts.razor.summary',
    sectionLine: 'thoughts.razor.sections.cut',
    sectionGuide: 'thoughts.razor.sections.guide',
    sectionTrail: 'thoughts.razor.sections.trail',
    sectionFocus: 'thoughts.razor.sections.focus',
    beatLine: 'thoughts.razor.beats.cut',
    beatGuide: 'thoughts.razor.beats.guide',
    beatGuidedHits: 'thoughts.razor.beats.guidedHits',
    beatTrail: 'thoughts.razor.beats.trail',
    beatTrailExtent: 'thoughts.razor.beats.trailExtent',
    beatFocus: 'thoughts.razor.beats.focus',
    beatFocusedHit: 'thoughts.razor.beats.focusedHit',
  },
});
