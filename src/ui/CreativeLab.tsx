import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '../game/engine';
import type { CreativeSetup } from '../game/types';
import { signalName } from '../i18n/presentation';
import { SIGNAL_IDS, signalRegistry } from '../signals';
import { CalibrationSlider } from './CalibrationSlider';
import { SignalIcon } from './SignalIcon';
import './CreativeLab.css';

const SIGNAL_GRID_COLUMNS = 3;
const SIGNAL_GRID_EMPTY_CELLS = (SIGNAL_GRID_COLUMNS - SIGNAL_IDS.length % SIGNAL_GRID_COLUMNS) % SIGNAL_GRID_COLUMNS;

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
    <div className="creative-signal-grid">{SIGNAL_IDS.map((type) => {
      const signal = signalRegistry.require(type);
      const name = signalName(t, type);
      return <button key={type} style={{ '--signal-color': signal.visual.color } as CSSProperties} onClick={() => engine.spawnCreativeSignal(type)} title={t('creativeLab.spawnNow', { signal: name })}>
        <span className="creative-signal-symbol"><SignalIcon type={type} monochrome /></span>
        <span className="creative-signal-name">{name}</span>
        <b aria-hidden="true">＋</b>
      </button>;
    })}{SIGNAL_GRID_EMPTY_CELLS > 0
      ? <span
        className="creative-signal-grid-fill"
        style={{ gridColumn: `span ${SIGNAL_GRID_EMPTY_CELLS}` }}
        aria-hidden="true"
      />
      : null}</div>
    <div className="creative-scales">
      <CalibrationSlider layout="stacked" label={t('levelSelect.healthScale')} min={0.25} max={5} step={0.25} value={setup.healthScale} onChange={(value) => engine.configureCreativeScales(value, setup.speedScale)} />
      <CalibrationSlider layout="stacked" label={t('levelSelect.speedScale')} min={0.25} max={3} step={0.25} value={setup.speedScale} onChange={(value) => engine.configureCreativeScales(setup.healthScale, value)} />
    </div>
    </div>
  </section>;
}
