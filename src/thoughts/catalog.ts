import { cinderTrailThought } from '../modules/cinder-trail.thought';
import { focusCoreThought } from '../modules/focus-core.thought';
import { frostThought } from '../modules/frost.thought';
import { impactTriggerThought } from '../modules/impact-trigger.thought';
import { pulseThought } from '../modules/pulse.thought';
import type { ThoughtDefinition } from './types';

/** Explicit ordering for the player-facing Thought Index. */
export const THOUGHT_CATALOG = [
  pulseThought,
  frostThought,
  impactTriggerThought,
  cinderTrailThought,
  focusCoreThought,
] as const satisfies readonly ThoughtDefinition[];
