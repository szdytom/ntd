import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import { TARGETING_MODES } from '@prism-bastion/game-core/game/types';
import type { TargetingMode, Tower } from '@prism-bastion/game-core/game/types';
import './TowerOverview.css';

export function TowerOverview({ tower, engine }: { tower: Tower; engine: GameEngine }) {
  const { t } = useTranslation();
  const color = engine.getTowerColor(tower);
  const energyRatio = tower.maxEnergy > 0 ? Math.max(0, Math.min(1, tower.energy / tower.maxEnergy)) : 0;
  const upgradeCost = engine.getTowerUpgradeCost(tower);
  return <>
    <div className="tower-overview" style={{ '--tower-color': color } as CSSProperties}>
      <div className="tower-avatar"><i /><b /><span /></div>
      <div className="tower-title"><h3>{t('tower.refractor')} <span>{t('tower.nodeNumber', { id: String(tower.id).padStart(2, '0') })}</span></h3><div className="online"><i />{t('tower.online', { level: tower.level })}</div></div>
      <div className="energy-gauge"><small>{t('tower.energy')}</small><strong>{Math.round(tower.energy)}<em>/{tower.maxEnergy}</em></strong><div><i style={{ width: `${energyRatio * 100}%` }} /></div></div>
    </div>
    <div className="stat-grid">
      <div className="stat-card purple"><span className="stat-symbol regen" aria-hidden="true" /><small>{t('tower.regen')}</small><strong>{tower.energyRegen}<em>{t('tower.perSecond')}</em></strong></div>
      <div className="stat-card coral"><span className="stat-symbol cooldown" aria-hidden="true" /><small>{t('tower.cooldown')}</small><strong>{tower.cooldown.toFixed(2)}<em> {t('common.seconds')}</em></strong></div>
      <div className="stat-card mint"><span className="stat-symbol range" aria-hidden="true" /><small>{t('tower.range')}</small><strong>{Math.round(tower.range)}<em>{t('common.units')}</em></strong></div>
      <div className="stat-card amber"><span className="stat-symbol slots" aria-hidden="true" /><small>{t('tower.slots')}</small><strong>{tower.slots.length}<em>{t('tower.slotUnit')}</em></strong></div>
    </div>
    <div className="tower-controls">
      <label><span>{t('tower.targeting')}</span><select value={tower.targeting} onChange={(event) => engine.setTargeting(event.target.value as TargetingMode)}>
        {TARGETING_MODES.map((option) => <option key={option} value={option}>{t(`tower.target.${option}`)}</option>)}
      </select></label>
      <button onClick={() => engine.upgradeSelectedTower()} disabled={upgradeCost === 0 || engine.status === 'wave'}
        title={upgradeCost === 0 ? t('tower.maxTitle') : t('tower.upgradeTitle')}>
        <span>{upgradeCost === 0 ? t('tower.maximum') : t('tower.upgrade', { level: tower.level + 1 })}</span><strong>{upgradeCost === 0 ? t('tower.maxed') : `${upgradeCost} ◇`}</strong>
      </button>
    </div>
  </>;
}
