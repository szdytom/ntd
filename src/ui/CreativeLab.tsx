import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMIES } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { CreativeSetup, EnemyType } from '../game/types';
import { enemyName } from '../i18n/presentation';
import { CalibrationSlider } from './CalibrationSlider';
import { SignalIcon } from './SignalIcon';
import './CreativeLab.css';

const ENEMY_TYPES: readonly EnemyType[] = ['spark', 'surge', 'kite', 'block', 'hex', 'crown', 'fracture', 'anvil', 'radiant'];

export function CreativeLab({ engine, setup, onClose }: { engine: GameEngine; setup: CreativeSetup; onClose: () => void }) {
  const { t } = useTranslation();
  return <section className="creative-lab" role="dialog" aria-labelledby="creative-lab-title">
    <header className="creative-lab-head">
      <span className="creative-signal-seal" aria-hidden="true"><i /></span>
      <div>
        <h2 id="creative-lab-title">{t('creativeLab.title')}</h2>
        <small>{t('creativeLab.description')}</small>
      </div>
      <button type="button" className="creative-lab-close" onClick={onClose} aria-label={t('creativeLab.close')}>×</button>
    </header>
    <div className="creative-lab-body">
    <div className="creative-enemy-grid">{ENEMY_TYPES.map((type) => {
      const enemy = ENEMIES[type];
      const name = enemyName(t, type);
      return <button key={type} style={{ '--enemy-color': enemy.color } as CSSProperties} onClick={() => engine.spawnCreativeEnemy(type)} title={t('creativeLab.spawnNow', { enemy: name })}>
        <span className="creative-enemy-symbol"><SignalIcon type={type} monochrome /></span>
        <span className="creative-enemy-name">{name}</span>
        <b aria-hidden="true">＋</b>
      </button>;
    })}</div>
    <div className="creative-scales">
      <CalibrationSlider layout="stacked" label={t('levelSelect.healthScale')} min={0.25} max={5} step={0.25} value={setup.healthScale} onChange={(value) => engine.configureCreativeScales(value, setup.speedScale)} />
      <CalibrationSlider layout="stacked" label={t('levelSelect.speedScale')} min={0.25} max={3} step={0.25} value={setup.speedScale} onChange={(value) => engine.configureCreativeScales(setup.healthScale, value)} />
    </div>
    </div>
  </section>;
}
