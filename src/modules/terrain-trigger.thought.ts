import { buildTriggerThought } from '../thoughts/authoring';
import { terrainTriggerModule } from './terrain-trigger';

const copy = {
  title: 'thoughts.terrainTrigger.title',
  summary: 'thoughts.terrainTrigger.summary',
  section: 'thoughts.terrainTrigger.sections.terrain',
  beatTrigger: 'thoughts.terrainTrigger.beats.trigger',
  beatRelease: 'thoughts.terrainTrigger.beats.release',
} as const;

export const terrainTriggerThought = buildTriggerThought({
  module: terrainTriggerModule,
  copy,
  seed: 167,
});
