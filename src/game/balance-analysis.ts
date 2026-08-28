import { COMBAT_BALANCE, ECONOMY_BALANCE } from './balance';
import { ENEMIES, LEVELS } from './config';
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
    const healthScale = COMBAT_BALANCE.waveHealthGrowth ** waveIndex * level.enemyHealthScale;
    let units = 0;
    let effectiveHp = 0;
    let speedPressure = 0;
    let killIncome = 0;
    for (const type of wave) {
      const enemy = ENEMIES[type];
      const bodyHp = Math.round(enemy.hp * healthScale);
      const durability = bodyHp + Math.round((enemy.shield?.capacity ?? 0) * healthScale);
      const splitCount = enemy.split?.count ?? 0;
      const splitHp = enemy.split ? Math.max(1, Math.round(bodyHp * enemy.split.healthScale)) : 0;
      effectiveHp += durability + splitHp * splitCount;
      speedPressure += durability * enemy.speed * level.enemySpeedScale / 60;
      if (enemy.split) {
        speedPressure += splitHp * splitCount * enemy.speed * enemy.split.speedScale * level.enemySpeedScale / 60;
      }
      killIncome += enemy.reward;
      if (enemy.split) killIncome += Math.max(1, Math.round(enemy.reward * enemy.split.rewardScale)) * splitCount;
      units += 1 + splitCount;
    }
    const spawnDuration = 0.25 + wave.slice(0, -1).reduce(
      (sum, type) => sum + ENEMIES[type].spawnDelay,
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
    };
  }));
}
