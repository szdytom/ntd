import type { TowerStatAllocation } from './types';

export const TOWER_STAT_BUDGET = 12;

const BASE_STATS = {
  maxEnergy: 90,
  energyRegen: 11,
  cooldown: 1.15,
  slotCount: 3,
  range: 175,
} as const;

type UpgradeKey = 'capacity' | 'regeneration' | 'cooldown' | 'slots' | 'range';

interface UpgradeRule {
  key: UpgradeKey;
  cost: number;
  maxLevel: number;
  weight: number;
}

const UPGRADE_RULES: readonly UpgradeRule[] = [
  { key: 'capacity', cost: 1, maxLevel: 5, weight: 1 },
  { key: 'regeneration', cost: 1, maxLevel: 5, weight: 1.15 },
  { key: 'cooldown', cost: 1, maxLevel: 5, weight: 0.9 },
  { key: 'slots', cost: 3, maxLevel: 3, weight: 0.55 },
  { key: 'range', cost: 1, maxLevel: 5, weight: 0.9 },
];

export interface TowerStatRoll {
  maxEnergy: number;
  energyRegen: number;
  cooldown: number;
  slotCount: number;
  range: number;
  allocation: TowerStatAllocation;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function rollTowerStats(random: () => number): TowerStatRoll {
  const levels: Record<UpgradeKey, number> = {
    capacity: 0,
    regeneration: 0,
    cooldown: 0,
    slots: 0,
    range: 0,
  };
  let remaining = TOWER_STAT_BUDGET;

  while (remaining > 0) {
    const available = UPGRADE_RULES.filter((rule) => rule.cost <= remaining && levels[rule.key] < rule.maxLevel);
    if (available.length === 0) break;
    const totalWeight = available.reduce((sum, rule) => sum + rule.weight, 0);
    let roll = random() * totalWeight;
    let selected = available[available.length - 1];
    if (!selected) break;
    for (const rule of available) {
      roll -= rule.weight;
      if (roll <= 0) {
        selected = rule;
        break;
      }
    }
    levels[selected.key] += 1;
    remaining -= selected.cost;
  }

  const slotInvestment = levels.slots * 3;
  return {
    maxEnergy: BASE_STATS.maxEnergy + levels.capacity * 20,
    energyRegen: BASE_STATS.energyRegen + levels.regeneration * 1.5,
    cooldown: Math.round((BASE_STATS.cooldown - levels.cooldown * 0.065) * 100) / 100,
    slotCount: BASE_STATS.slotCount + levels.slots,
    range: BASE_STATS.range + levels.range * 13,
    allocation: {
      budget: TOWER_STAT_BUDGET,
      capacity: levels.capacity,
      regeneration: levels.regeneration,
      cooldown: levels.cooldown,
      slots: slotInvestment,
      range: levels.range,
    },
  };
}
