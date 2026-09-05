import { createModuleRegistry, DRAFT_BALANCE } from '@prism-bastion/game-core/modules';
import { getLevel } from '@prism-bastion/game-core/game/config';
import { calculateInventoryQuality, calculateQualityCenter, rollModuleDraft } from '@prism-bastion/game-core/game/draft';
import { createSeededRandom } from '@prism-bastion/game-core/game/tower-generation';
import type { ModuleId } from '@prism-bastion/game-core/game/types';
import type { CoopPoolCount } from './pool';
import type { CoopDraftOffer, CoopPlayerId, CoopPlayerPlan } from './types';

export interface CoopDraftPlayerRuntime {
  previousChoices: Set<ModuleId>;
  abandonsUsed: number;
  qualityBoostPending: boolean;
}

export interface CoopDraftRuntime {
  pick: number;
  totalPicks: number;
  random: () => number;
  players: Record<CoopPlayerId, CoopDraftPlayerRuntime>;
}

const createPlayerRuntime = (): CoopDraftPlayerRuntime => ({
  previousChoices: new Set(),
  abandonsUsed: 0,
  qualityBoostPending: false,
});

export function createCoopDraftRuntime(seed: number, totalPicks: number): CoopDraftRuntime {
  return {
    pick: 1,
    totalPicks,
    random: createSeededRandom(seed),
    players: { p1: createPlayerRuntime(), p2: createPlayerRuntime() },
  };
}

export function generateCoopDraftOffers(
  runtime: CoopDraftRuntime,
  activePlayers: readonly CoopPlayerId[],
  plans: Readonly<Record<CoopPlayerId, CoopPlayerPlan>>,
  pool: Readonly<Record<ModuleId, CoopPoolCount>>,
  levelId: string,
  completedWaves: number,
): Partial<Record<CoopPlayerId, CoopDraftOffer>> {
  const definitions = createModuleRegistry().list();
  const level = getLevel(levelId);
  const reserved = new Map<ModuleId, number>();
  const priority = [...activePlayers].sort((left, right) => {
    const first = (completedWaves + runtime.pick) % 2 === 0 ? 'p1' : 'p2';
    if (left === first) return -1;
    if (right === first) return 1;
    return left.localeCompare(right);
  });
  const offers: Partial<Record<CoopPlayerId, CoopDraftOffer>> = {};

  for (const playerId of priority) {
    const state = runtime.players[playerId];
    const plan = plans[playerId];
    const availableDefinitions = definitions.filter((definition) => {
      const available = pool[definition.id] ?? 0;
      return available === 'unlimited' || available - (reserved.get(definition.id) ?? 0) > 0;
    });
    const inventoryAverage = calculateInventoryQuality(definitions, (moduleId) => plan.inventory[moduleId] ?? 0);
    const anchorIndex = Math.min(completedWaves, level.moduleDraft.qualityAnchors.length - 1);
    const anchor = level.moduleDraft.qualityAnchors[anchorIndex] ?? 1;
    const qualityCenter = calculateQualityCenter({
      anchor,
      inventoryAverage,
      inventoryInfluence: level.moduleDraft.inventoryInfluence,
      qualityBias: level.moduleDraft.qualityBias,
      boost: state.qualityBoostPending ? DRAFT_BALANCE.abandonQualityBoost : 0,
    });
    const result = rollModuleDraft({
      definitions: availableDefinitions,
      ownedCount: (moduleId) => plan.inventory[moduleId] ?? 0,
      availableCount: (moduleId) => {
        const available = pool[moduleId] ?? 0;
        if (available === 'unlimited') return 1_000_000;
        return Math.max(0, available - (reserved.get(moduleId) ?? 0));
      },
      random: runtime.random,
      previousChoices: state.previousChoices,
      qualityCenter,
      projectileDeficit: 0,
    });
    for (const moduleId of result.choices) {
      if (pool[moduleId] !== 'unlimited') reserved.set(moduleId, (reserved.get(moduleId) ?? 0) + 1);
    }
    state.previousChoices = result.previousChoices;
    offers[playerId] = {
      pick: runtime.pick,
      totalPicks: runtime.totalPicks,
      choices: result.choices,
      canAbandon: state.abandonsUsed < level.moduleDraft.abandonLimit,
      boosted: state.qualityBoostPending,
    };
  }
  return offers;
}

export function resolveCoopDraftDecision(
  runtime: CoopDraftRuntime,
  playerId: CoopPlayerId,
  offer: CoopDraftOffer,
  choice: ModuleId | null,
  plan: CoopPlayerPlan,
  pool: Record<ModuleId, CoopPoolCount>,
): { ok: true } | { ok: false; reason: string } {
  const state = runtime.players[playerId];
  if (choice === null) {
    if (!offer.canAbandon) return { ok: false, reason: 'abandon-unavailable' };
    state.abandonsUsed += 1;
    state.qualityBoostPending = true;
    return { ok: true };
  }
  if (!offer.choices.includes(choice)) return { ok: false, reason: 'choice-unavailable' };
  const available = pool[choice] ?? 0;
  if (available !== 'unlimited') {
    if (available <= 0) return { ok: false, reason: 'pool-exhausted' };
    pool[choice] = available - 1;
  }
  plan.inventory[choice] = (plan.inventory[choice] ?? 0) + 1;
  state.qualityBoostPending = false;
  return { ok: true };
}
