import { arcboltThought } from './arcbolt.thought';
import { barrageThought } from './barrage.thought';
import { cinderTrailThought } from './cinder-trail.thought';
import { colossusThought } from './colossus.thought';
import { condenseCoreThought } from './condense-core.thought';
import { doubleForkThought } from './double-fork.thought';
import { echoThought } from './echo.thought';
import { economizerThought } from './economizer.thought';
import { emergencyBatteryThought } from './emergency-battery.thought';
import { emberCoatingThought } from './ember-coating.thought';
import { emberFieldThought } from './ember-field.thought';
import { expirationTriggerThought } from './expiration-trigger.thought';
import { focusCoreThought } from './focus-core.thought';
import { forkThought } from './fork.thought';
import { frostThought } from './frost.thought';
import { geodeBloomThought } from './geode-bloom.thought';
import { impactTriggerThought } from './impact-trigger.thought';
import { needleThought } from './needle.thought';
import { novaThought } from './nova.thought';
import { overdriveThought } from './overdrive.thought';
import { prismSlugThought } from './prism-slug.thought';
import { proximityMineThought } from './proximity-mine.thought';
import { pulseThought } from './pulse.thought';
import { razorThought } from './razor.thought';
import { reclaimCircuitThought } from './reclaim-circuit.thought';
import { resonantTrailThought } from './resonant-trail.thought';
import { ricochetThought } from './ricochet.thought';
import { riftBarrierThought } from './rift-barrier.thought';
import { riftTrailThought } from './rift-trail.thought';
import { searingSigilThought } from './searing-sigil.thought';
import { seekerThought } from './seeker.thought';
import { singularityThought } from './singularity.thought';
import { starfireTrailThought } from './starfire-trail.thought';
import { starfireMatrixThought } from './starfire-matrix.thought';
import { terrainTriggerThought } from './terrain-trigger.thought';
import { teslaNodeThought } from './tesla-node.thought';
import { timerTriggerThought } from './timer-trigger.thought';
import { toxicCloudThought } from './toxic-cloud.thought';
import { toxinThought } from './toxin.thought';
import { voidBeamThought } from './void-beam.thought';
import type { ThoughtDefinition } from './types';

/** Explicit ordering for the player-facing Thought Index. */
export const THOUGHT_CATALOG = [
  pulseThought,
  frostThought,
  impactTriggerThought,
  cinderTrailThought,
  focusCoreThought,
  emberCoatingThought,
  toxinThought,
  searingSigilThought,
  starfireMatrixThought,
  prismSlugThought,
  novaThought,
  geodeBloomThought,
  arcboltThought,
  razorThought,
  needleThought,
  voidBeamThought,
  doubleForkThought,
  forkThought,
  overdriveThought,
  ricochetThought,
  colossusThought,
  condenseCoreThought,
  starfireTrailThought,
  riftTrailThought,
  resonantTrailThought,
  proximityMineThought,
  riftBarrierThought,
  teslaNodeThought,
  emberFieldThought,
  toxicCloudThought,
  singularityThought,
  echoThought,
  barrageThought,
  seekerThought,
  timerTriggerThought,
  expirationTriggerThought,
  terrainTriggerThought,
  economizerThought,
  emergencyBatteryThought,
  reclaimCircuitThought,
] as const satisfies readonly ThoughtDefinition[];
