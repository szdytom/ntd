import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMIES } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { CreativeSetup, EnemyType } from '../game/types';
import { enemyName } from '../i18n/presentation';
import './CreativeLab.css';

const ENEMY_TYPES: readonly EnemyType[] = ['spark', 'surge', 'kite', 'block', 'hex', 'crown', 'fracture', 'anvil', 'radiant'];

export function CreativeLab({ engine, setup }: { engine: GameEngine; setup: CreativeSetup }) {
  const { t } = useTranslation();
  return <section className="creative-lab">
    <div className="section-title"><div><h3>{t('creativeLab.title')}</h3><small>{t('creativeLab.description')}</small></div></div>
    <div className="creative-enemy-grid">{ENEMY_TYPES.map((type) => {
      const enemy = ENEMIES[type];
      const name = enemyName(t, type);
      return <button key={type} onClick={() => engine.spawnCreativeEnemy(type)} title={t('creativeLab.spawnNow', { enemy: name })}>
        <span style={{ '--enemy-color': enemy.color } as CSSProperties}><i className={enemy.shape === 'fracture' ? 'fracture' : enemy.shape === 'ring' ? 'ring' : enemy.shape === 'surge' ? 'surge' : enemy.shape === 'anvil' ? 'anvil' : ''} />{name}</span>
        <b aria-hidden="true">＋</b>
      </button>;
    })}</div>
    <div className="creative-scales">
      <label><span>{t('levelSelect.healthScale')}</span><input type="range" min="0.25" max="5" step="0.25" value={setup.healthScale} onChange={(event) => engine.configureCreativeScales(Number(event.target.value), setup.speedScale)} /><b>{setup.healthScale.toFixed(2)}×</b></label>
      <label><span>{t('levelSelect.speedScale')}</span><input type="range" min="0.25" max="3" step="0.25" value={setup.speedScale} onChange={(event) => engine.configureCreativeScales(setup.healthScale, Number(event.target.value))} /><b>{setup.speedScale.toFixed(2)}×</b></label>
    </div>
  </section>;
}
