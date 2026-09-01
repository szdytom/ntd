import type { GameEngine } from '../game/engine';
import type { GameSnapshot } from '../game/types';
import { useTranslation } from 'react-i18next';
import { SettingsPanel } from './SettingsPanel';
import './GameHeader.css';

export function GameHeader({
  engine,
  snapshot,
  onExit,
}: {
  engine: GameEngine;
  snapshot: GameSnapshot;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const drafting = Boolean(snapshot.draft);
  const waveDisabled = snapshot.status !== 'planning' || drafting;
  const launchLabel = snapshot.status === 'wave'
    ? t('header.signals', { count: snapshot.signalsAlive + snapshot.waveQueue })
    : snapshot.status === 'reward'
      ? t('header.awaitingDraft')
      : t('header.launch');
  const launchWave = snapshot.wave >= snapshot.maxWaves
    ? t('header.complete')
    : t('header.waveNumber', { wave: String(snapshot.wave + 1).padStart(2, '0') });

  return (
    <header className="topbar">
      <button className="exit-button" onClick={onExit} aria-label={t('header.exit')}>
        <span aria-hidden="true">←</span><strong>{t('header.back')}</strong>
      </button>

      <div className="top-stats" aria-label={t('header.gameStatus')}>
        <div className="metric core-metric">
          <span className="metric-icon heart-icon">♥</span>
          <div><small>{t('header.core')}</small><strong>{snapshot.core}<em>/{snapshot.maxCore}</em></strong></div>
          <div className="micro-bar"><i style={{ width: `${snapshot.core / snapshot.maxCore * 100}%` }} /></div>
        </div>
        <div className="metric shard-metric">
          <span className="metric-icon shard-icon">◇</span>
          <div><small>{t('header.shards')}</small><strong>{snapshot.mode === 'creative' ? '∞' : snapshot.shards}</strong></div>
        </div>
        <div className="metric wave-metric">
          <span className="metric-icon wave-icon">≋</span>
          <div><small>{t('header.wave')}</small><strong>{snapshot.wave}<em>/{snapshot.maxWaves}</em></strong></div>
        </div>
      </div>

      <div className="top-actions">
        <SettingsPanel />
        <div className="speed-switch" role="group" aria-label={t('header.speed')}>
          {[1, 2].map((speed) => (
            <button key={speed} disabled={drafting} className={snapshot.speed === speed ? 'active' : ''} onClick={() => engine.setSpeed(speed)}>{speed}×</button>
          ))}
        </div>
        <button disabled={drafting} className={`icon-button pause-button ${snapshot.manuallyPaused ? 'active' : ''}`} onClick={() => engine.togglePause()} aria-label={snapshot.manuallyPaused ? t('header.resume') : t('header.pause')}>
          <span className="pause-glyph">{snapshot.manuallyPaused ? '▶' : 'Ⅱ'}</span>
        </button>
        <button
          className="launch-button"
          data-tutorial-launch
          onClick={() => engine.startWave()}
          disabled={waveDisabled}
          aria-label={`${launchLabel} · ${launchWave}`}
        >
          <span className="launch-icon">▶</span>
          <span className="launch-copy"><small>{launchLabel}</small><strong>{launchWave}</strong></span>
        </button>
      </div>
    </header>
  );
}
