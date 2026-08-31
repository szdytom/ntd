import { arcboltModule } from './arcbolt';
import { barrageModule } from './barrage';
import { colossusModule } from './colossus';
import { condenseCoreModule } from './condense-core';
import { doubleForkModule } from './double-fork';
import { economizerModule } from './economizer';
import { emberCoatingModule } from './ember-coating';
import { emberFieldModule } from './ember-field';
import { echoModule } from './echo';
import { expirationTriggerModule } from './expiration-trigger';
import { forkModule } from './fork';
import { frostModule } from './frost';
import { focusCoreModule } from './focus-core';
import { impactTriggerModule } from './impact-trigger';
import { needleModule } from './needle';
import { novaModule } from './nova';
import { overdriveModule } from './overdrive';
import { resonantTrailModule } from './resonant-trail';
import { riftTrailModule } from './rift-trail';
import { pulseModule } from './pulse';
import { proximityMineModule } from './proximity-mine';
import { reclaimCircuitModule } from './reclaim-circuit';
import { razorModule } from './razor';
import { ricochetModule } from './ricochet';
import { ModuleRegistry } from './registry';
import { seekerModule } from './seeker';
import { searingSigilModule } from './searing-sigil';
import { singularityModule } from './singularity';
import { starfireMatrixModule } from './starfire-matrix';
import { teslaNodeModule } from './tesla-node';
import { terrainTriggerModule } from './terrain-trigger';
import { timerTriggerModule } from './timer-trigger';
import { toxicCloudModule } from './toxic-cloud';
import { toxinModule } from './toxin';
import { voidBeamModule } from './void-beam';

export function createModuleRegistry(): ModuleRegistry {
  return new ModuleRegistry()
    .register(pulseModule)
    .register(needleModule)
    .register(voidBeamModule)
    .register(novaModule)
    .register(overdriveModule)
    .register(frostModule)
    .register(doubleForkModule)
    .register(forkModule)
    .register(echoModule)
    .register(seekerModule)
    .register(arcboltModule)
    .register(resonantTrailModule)
    .register(riftTrailModule)
    .register(razorModule)
    .register(ricochetModule)
    .register(emberCoatingModule)
    .register(toxinModule)
    .register(searingSigilModule)
    .register(starfireMatrixModule)
    .register(colossusModule)
    .register(focusCoreModule)
    .register(condenseCoreModule)
    .register(barrageModule)
    .register(economizerModule)
    .register(reclaimCircuitModule)
    .register(proximityMineModule)
    .register(singularityModule)
    .register(teslaNodeModule)
    .register(emberFieldModule)
    .register(toxicCloudModule)
    .register(impactTriggerModule)
    .register(timerTriggerModule)
    .register(expirationTriggerModule)
    .register(terrainTriggerModule);
}

export { ModuleRegistry } from './registry';
export { DRAFT_BALANCE, MODULE_RARITIES } from './rarity';
export type { ModuleDefinition, ModuleKind, ModuleRarity, ModuleTag } from './types';
