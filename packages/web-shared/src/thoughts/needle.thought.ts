import { buildPiercingProjectileThought } from '../thoughts/authoring';
import { needleModule } from '@prism-bastion/game-core/modules/needle';

export const needleThought = buildPiercingProjectileThought({
  module: needleModule,
  seed: 71,
  hitOccurrence: 3,
  copy: {
    title: 'thoughts.needle.title',
    summary: 'thoughts.needle.summary',
    sectionLine: 'thoughts.needle.sections.pierce',
    sectionGuide: 'thoughts.needle.sections.guide',
    sectionTrail: 'thoughts.needle.sections.trail',
    sectionFocus: 'thoughts.needle.sections.focus',
    beatLine: 'thoughts.needle.beats.pierce',
    beatGuide: 'thoughts.needle.beats.guide',
    beatGuidedHits: 'thoughts.needle.beats.guidedHits',
    beatTrail: 'thoughts.needle.beats.trail',
    beatTrailExtent: 'thoughts.needle.beats.trailExtent',
    beatFocus: 'thoughts.needle.beats.focus',
    beatFocusedHit: 'thoughts.needle.beats.focusedHit',
  },
});
