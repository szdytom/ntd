import { ECONOMY_BALANCE } from '@prism-bastion/game-core/game/balance';
import { getLevel } from '@prism-bastion/game-core/game/config';
import { getDifficulty } from '@prism-bastion/game-core/game/difficulty';
import { createSeededRandom, rollTowerStats } from '@prism-bastion/game-core/game/tower-generation';
import { TARGETING_MODES } from '@prism-bastion/game-core/game/types';
import type { DifficultyId, ModuleId, TargetingMode } from '@prism-bastion/game-core/game/types';
import { isKnownCoopModule } from './pool';
import type { CoopPlayerPlan, CoopPlanningCommand, CoopTowerPlan } from './types';

const MAX_TOWER_LEVEL = 5;
const mixSeed = (seed: number, ordinal: number): number => (
  Math.imul((seed ^ 0x9e3779b9) >>> 0, 0x85ebca6b) + Math.imul(ordinal + 1, 0xc2b2ae35)
) >>> 0;

const createTower = (seed: number, towerId: number, padIndex: number): CoopTowerPlan => {
  const stats = rollTowerStats(createSeededRandom(mixSeed(seed, towerId)));
  return {
    id: towerId,
    padIndex,
    maxEnergy: stats.maxEnergy,
    energyRegen: stats.energyRegen,
    cooldown: stats.cooldown,
    range: stats.range,
    targeting: 'core-nearest',
    level: 1,
    slots: Array.from({ length: stats.slotCount }, () => null),
  };
};

export function createInitialCoopPlan(
  levelId: string,
  difficultyId: DifficultyId,
  seed: number,
): CoopPlayerPlan {
  const level = getLevel(levelId);
  const difficulty = getDifficulty(difficultyId);
  const tower = createTower(seed, 1, 0);
  tower.slots[0] = 'frost';
  tower.slots[1] = 'pulse';
  return {
    core: 20,
    maxCore: 20,
    shards: Math.round(level.startingShards * difficulty.economy),
    towers: [tower],
    inventory: { pulse: 3, frost: 2 },
    nextTowerId: 2,
  };
}

const installedCount = (plan: CoopPlayerPlan, moduleId: ModuleId, excluded?: { towerId: number; slot: number }): number => (
  plan.towers.reduce((sum, tower) => sum + tower.slots.reduce((count, installed, slot) => (
    count + Number(installed === moduleId && !(excluded?.towerId === tower.id && excluded.slot === slot))
  ), 0), 0)
);

const isTargetingMode = (value: TargetingMode): boolean => TARGETING_MODES.some((mode) => mode === value);

export function applyCoopPlanningCommand(
  current: CoopPlayerPlan,
  command: CoopPlanningCommand,
  levelId: string,
  towerSeed: number,
): { ok: true; plan: CoopPlayerPlan } | { ok: false; reason: string } {
  const plan = structuredClone(current);
  const level = getLevel(levelId);
  if (command.type === 'place-tower') {
    if (!Number.isInteger(command.padIndex) || !level.towerPads[command.padIndex]) return { ok: false, reason: 'invalid-pad' };
    if (plan.towers.some((tower) => tower.padIndex === command.padIndex)) return { ok: false, reason: 'occupied-pad' };
    if (plan.shards < ECONOMY_BALANCE.towerCost) return { ok: false, reason: 'insufficient-shards' };
    plan.shards -= ECONOMY_BALANCE.towerCost;
    plan.towers.push(createTower(towerSeed, plan.nextTowerId, command.padIndex));
    plan.nextTowerId += 1;
    return { ok: true, plan };
  }

  const tower = plan.towers.find((candidate) => candidate.id === command.towerId);
  if (!tower) return { ok: false, reason: 'unknown-tower' };
  if (command.type === 'upgrade-tower') {
    if (tower.level >= MAX_TOWER_LEVEL) return { ok: false, reason: 'max-level' };
    const cost = ECONOMY_BALANCE.upgradeCosts[tower.level] ?? 0;
    if (plan.shards < cost) return { ok: false, reason: 'insufficient-shards' };
    plan.shards -= cost;
    tower.level += 1;
    tower.maxEnergy += 16;
    tower.energyRegen = Math.round((tower.energyRegen + 1.3) * 10) / 10;
    tower.cooldown = Math.max(0.55, Math.round(tower.cooldown * 0.96 * 100) / 100);
    tower.range += 10;
    if (tower.level === 3 || tower.level === 5) tower.slots.push(null);
    return { ok: true, plan };
  }
  if (command.type === 'set-targeting') {
    if (!isTargetingMode(command.targeting)) return { ok: false, reason: 'invalid-targeting' };
    tower.targeting = command.targeting;
    return { ok: true, plan };
  }
  if (command.type === 'install-module') {
    if (!Number.isInteger(command.slotIndex) || command.slotIndex < 0 || command.slotIndex >= tower.slots.length) {
      return { ok: false, reason: 'invalid-slot' };
    }
    if (command.moduleId !== null) {
      if (!isKnownCoopModule(command.moduleId)) return { ok: false, reason: 'unknown-module' };
      const owned = plan.inventory[command.moduleId] ?? 0;
      if (installedCount(plan, command.moduleId, { towerId: tower.id, slot: command.slotIndex }) >= owned) {
        return { ok: false, reason: 'module-unavailable' };
      }
    }
    tower.slots[command.slotIndex] = command.moduleId;
    return { ok: true, plan };
  }
  if (command.type === 'swap-modules') {
    if (
      !Number.isInteger(command.from) || !Number.isInteger(command.to)
      || command.from < 0 || command.to < 0
      || command.from >= tower.slots.length || command.to >= tower.slots.length
    ) return { ok: false, reason: 'invalid-slot' };
    [tower.slots[command.from], tower.slots[command.to]] = [tower.slots[command.to] ?? null, tower.slots[command.from] ?? null];
    return { ok: true, plan };
  }
  tower.slots.fill(null);
  return { ok: true, plan };
}

export function hashCoopPlan(plan: CoopPlayerPlan): string {
  const canonical = JSON.stringify(plan);
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
