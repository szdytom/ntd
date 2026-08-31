import { calculateDraftBalanceRows, calculateWaveBalanceRows, sampleTowerStatAverages } from '../src/game/balance-analysis';

const tower = sampleTowerStatAverages();
console.log('Tower averages (100,000 deterministic seeds)');
console.table({
  energy: tower.maxEnergy.toFixed(2),
  regeneration: tower.energyRegen.toFixed(2),
  cooldown: tower.cooldown.toFixed(2),
  slots: tower.slotCount.toFixed(2),
  range: tower.range.toFixed(2),
});

console.log('Wave balance');
console.table(calculateWaveBalanceRows().map((row) => ({
  level: row.levelName,
  wave: row.wave,
  units: row.units,
  spawnSeconds: row.spawnDuration.toFixed(2),
  effectiveHp: row.effectiveHp,
  speedPressure: Math.round(row.speedPressure),
  income: row.income,
  entrances: Object.entries(row.entranceFlow).map(([entrance, count]) => `${entrance}:${count}`).join(' · '),
})));

console.log('Module draft balance (one owned and idle copy of each module)');
console.table(calculateDraftBalanceRows().map((row) => ({
  level: row.levelName,
  batch: row.rewardBatch,
  sigma: row.inventoryAverage,
  anchor: row.anchor.toFixed(2),
  center: row.qualityCenter.toFixed(2),
  quality: Object.entries(row.qualityShares).map(([rarity, share]) => `${rarity}:${Math.round(share * 100)}%`).join(' · '),
  kinds: Object.entries(row.kindShares).map(([kind, share]) => `${kind}:${Math.round(share * 100)}%`).join(' · '),
})));
