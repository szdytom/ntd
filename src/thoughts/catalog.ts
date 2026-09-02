import { arcboltThought } from '../modules/arcbolt.thought';
import { barrageThought } from '../modules/barrage.thought';
import { cinderTrailThought } from '../modules/cinder-trail.thought';
import { colossusThought } from '../modules/colossus.thought';
import { condenseCoreThought } from '../modules/condense-core.thought';
import { doubleForkThought } from '../modules/double-fork.thought';
import { echoThought } from '../modules/echo.thought';
import { economizerThought } from '../modules/economizer.thought';
import { emergencyBatteryThought } from '../modules/emergency-battery.thought';
import { emberCoatingThought } from '../modules/ember-coating.thought';
import { emberFieldThought } from '../modules/ember-field.thought';
import { expirationTriggerThought } from '../modules/expiration-trigger.thought';
import { focusCoreThought } from '../modules/focus-core.thought';
import { forkThought } from '../modules/fork.thought';
import { frostThought } from '../modules/frost.thought';
import { geodeBloomThought } from '../modules/geode-bloom.thought';
import { impactTriggerThought } from '../modules/impact-trigger.thought';
import { needleThought } from '../modules/needle.thought';
import { novaThought } from '../modules/nova.thought';
import { overdriveThought } from '../modules/overdrive.thought';
import { prismSlugThought } from '../modules/prism-slug.thought';
import { proximityMineThought } from '../modules/proximity-mine.thought';
import { pulseThought } from '../modules/pulse.thought';
import { razorThought } from '../modules/razor.thought';
import { reclaimCircuitThought } from '../modules/reclaim-circuit.thought';
import { resonantTrailThought } from '../modules/resonant-trail.thought';
import { ricochetThought } from '../modules/ricochet.thought';
import { riftBarrierThought } from '../modules/rift-barrier.thought';
import { riftTrailThought } from '../modules/rift-trail.thought';
import { searingSigilThought } from '../modules/searing-sigil.thought';
import { seekerThought } from '../modules/seeker.thought';
import { singularityThought } from '../modules/singularity.thought';
import { starfireTrailThought } from '../modules/starfire-trail.thought';
import { starfireMatrixThought } from '../modules/starfire-matrix.thought';
import { terrainTriggerThought } from '../modules/terrain-trigger.thought';
import { teslaNodeThought } from '../modules/tesla-node.thought';
import { timerTriggerThought } from '../modules/timer-trigger.thought';
import { toxicCloudThought } from '../modules/toxic-cloud.thought';
import { toxinThought } from '../modules/toxin.thought';
import { voidBeamThought } from '../modules/void-beam.thought';
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
