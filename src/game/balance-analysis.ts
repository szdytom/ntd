import { COMBAT_BALANCE, ECONOMY_BALANCE } from './balance';
import { getSignalCapability, signalRegistry } from '../signals';
import { LEVELS, resolveSpawnEntrances } from './config';
import { createSeededRandom, rollTowerStats } from './tower-generation';

export interface TowerStatAverages {
  maxEnergy: number;
  energyRegen: number;
  cooldown: number;
  slotCount: number;
  range: number;
}

export interface WaveBalanceRow {
  levelId: string;
  levelName: string;
  wave: number;
  units: number;
  spawnDuration: number;
  effectiveHp: number;
  speedPressure: number;
  income: number;
  entranceFlow: Readonly<Record<string, number>>;
}

export function sampleTowerStatAverages(sampleCount = 100_000): TowerStatAverages {
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) throw new RangeError('sampleCount must be a positive integer');
  const total: TowerStatAverages = { maxEnergy: 0, energyRegen: 0, cooldown: 0, slotCount: 0, range: 0 };
  for (let seed = 0; seed < sampleCount; seed += 1) {
    const stats = rollTowerStats(createSeededRandom(seed));
    total.maxEnergy += stats.maxEnergy;
    total.energyRegen += stats.energyRegen;
    total.cooldown += stats.cooldown;
    total.slotCount += stats.slotCount;
    total.range += stats.range;
  }
  return {
    maxEnergy: total.maxEnergy / sampleCount,
    energyRegen: total.energyRegen / sampleCount,
    cooldown: total.cooldown / sampleCount,
    slotCount: total.slotCount / sampleCount,
    range: total.range / sampleCount,
  };
}

export function calculateWaveBalanceRows(): WaveBalanceRow[] {
  return LEVELS.flatMap((level) => level.waves.map((wave, waveIndex) => {
    const healthScale = COMBAT_BALANCE.waveHealthGrowth ** waveIndex * level.signalHealthScale;
    let units = 0;
    let effectiveHp = 0;
    let speedPressure = 0;
    let killIncome = 0;
    const entranceFlow: Record<string, number> = {};
    for (const entry of wave) {
      const type = entry.type;
      const entrances = resolveSpawnEntrances(entry, level.graph);
      for (const entrance of entrances) entranceFlow[entrance] = (entranceFlow[entrance] ?? 0) + 1;
      const copies = entrances.length;
      const definition = signalRegistry.require(type);
      const stats = definition.stats;
      const shield = getSignalCapability(definition, 'shield');
      const split = getSignalCapability(definition, 'split-on-death');
      const bodyHp = Math.round(stats.health * healthScale);
      const durability = bodyHp + Math.round((shield?.capacity ?? 0) * healthScale);
      const splitCount = split?.count ?? 0;
      const splitHp = split ? Math.max(1, Math.round(bodyHp * split.healthScale)) : 0;
      effectiveHp += (durability + splitHp * splitCount) * copies;
      speedPressure += durability * stats.speed * level.signalSpeedScale / 60 * copies;
      if (split) {
        speedPressure += splitHp * splitCount * stats.speed * split.speedScale * level.signalSpeedScale / 60 * copies;
      }
      killIncome += stats.reward * copies;
      if (split) killIncome += Math.max(1, Math.round(stats.reward * split.rewardScale)) * splitCount * copies;
      units += (1 + splitCount) * copies;
    }
    const spawnDuration = 0.25 + wave.slice(0, -1).reduce(
      (sum, entry) => sum + signalRegistry.require(entry.type).stats.spawnDelay,
      0,
    );
    const waveNumber = waveIndex + 1;
    return {
      levelId: level.id,
      levelName: level.name,
      wave: waveNumber,
      units,
      spawnDuration,
      effectiveHp,
      speedPressure,
      income: killIncome + ECONOMY_BALANCE.waveBonusBase + waveNumber * ECONOMY_BALANCE.waveBonusPerWave,
      entranceFlow,
    };
  }));
}
