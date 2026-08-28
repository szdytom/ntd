import type { CSSProperties } from 'react';
import type { GameEngine } from '../game/engine';
import type { TargetingMode, Tower } from '../game/types';
import './TowerOverview.css';

const TARGETING_OPTIONS: ReadonlyArray<{ value: TargetingMode; label: string }> = [
  { value: 'core-nearest', label: '距核心最近' }, { value: 'core-farthest', label: '距核心最远' },
  { value: 'hp-lowest', label: '当前血量最低' }, { value: 'hp-highest', label: '当前血量最高' },
  { value: 'tower-nearest', label: '距炮塔最近' }, { value: 'tower-farthest', label: '距炮塔最远' },
  { value: 'density-highest', label: '局部密度最高' }, { value: 'density-lowest', label: '局部密度最低' },
];

export function TowerOverview({ tower, engine }: { tower: Tower; engine: GameEngine }) {
  const color = engine.getTowerColor(tower);
  const energyRatio = tower.maxEnergy > 0 ? Math.max(0, Math.min(1, tower.energy / tower.maxEnergy)) : 0;
  const upgradeCost = engine.getTowerUpgradeCost(tower);
  return <>
    <div className="tower-overview" style={{ '--tower-color': color } as CSSProperties}>
      <div className="tower-avatar"><i /><b /><span /></div>
      <div className="tower-title"><small>当前节点</small><h3>折射塔 <span>T{String(tower.id).padStart(2, '0')}</span></h3><div className="online"><i />Lv.{tower.level} · 系统在线</div></div>
      <div className="energy-gauge"><small>能量</small><strong>{Math.round(tower.energy)}<em>/{tower.maxEnergy}</em></strong><div><i style={{ width: `${energyRatio * 100}%` }} /></div></div>
    </div>
    <div className="stat-grid">
      <div className="stat-card purple"><span className="stat-symbol regen" aria-hidden="true" /><small>能量回复速度</small><strong>{tower.energyRegen}<em> /秒</em></strong></div>
      <div className="stat-card coral"><span className="stat-symbol cooldown" aria-hidden="true" /><small>基础冷却时间</small><strong>{tower.cooldown.toFixed(2)}<em> 秒</em></strong></div>
      <div className="stat-card mint"><span className="stat-symbol range" aria-hidden="true" /><small>攻击范围</small><strong>{Math.round(tower.range)}<em> 单位</em></strong></div>
      <div className="stat-card amber"><span className="stat-symbol slots" aria-hidden="true" /><small>模块槽位</small><strong>{tower.slots.length}<em> 格</em></strong></div>
    </div>
    <div className="tower-controls">
      <label><span>攻击模式</span><select value={tower.targeting} onChange={(event) => engine.setTargeting(event.target.value as TargetingMode)}>
        {TARGETING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <button onClick={() => engine.upgradeSelectedTower()} disabled={upgradeCost === 0 || engine.status === 'wave'}
        title={upgradeCost === 0 ? '已达到最高等级' : '提升容量、回复、冷却与射程；部分等级增加槽位'}>
        <span>{upgradeCost === 0 ? 'MAX' : `升级 Lv.${tower.level + 1}`}</span><strong>{upgradeCost === 0 ? '已满级' : `${upgradeCost} ◇`}</strong>
      </button>
    </div>
  </>;
}
