export const ECONOMY_BALANCE = {
  towerCost: 80,
  waveBonusBase: 30,
  waveBonusPerWave: 8,
  upgradeCosts: [0, 90, 125, 165, 210] as const,
} as const;

export const COMBAT_BALANCE = {
  waveHealthGrowth: 1.13,
  splashDamageFactor: 0.55,
  maxEnergyRefundPerCycle: 0.6,
  projectileTrailInterval: 0.065,
} as const;
