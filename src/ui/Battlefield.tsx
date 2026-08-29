import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ECONOMY_BALANCE } from '../game/balance';
import { WORLD } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { GameViewSnapshot } from '../game/types';
import { difficultyName, levelName } from '../i18n/presentation';
import { GameCanvas } from './GameCanvas';
import { EnemyPreview } from './EnemyPreview';
import { CreativeLab } from './CreativeLab';
import './Battlefield.css';

export function Battlefield({ engine, view }: { engine: GameEngine; view: GameViewSnapshot }) {
  const { t } = useTranslation();
  const [creativePanelOpen, setCreativePanelOpen] = useState(false);
  const { game: snapshot } = view;
  const phase = snapshot.status === 'wave'
    ? t('battlefield.contact')
    : snapshot.status === 'reward'
      ? t('battlefield.intercepting')
      : snapshot.paused ? t('battlefield.paused') : t('battlefield.planning');
  const terminal = snapshot.status === 'won' || snapshot.status === 'lost';
  const spawn = engine.path.pointAtDistance(44).position;
  const core = engine.path.pointAtDistance(engine.path.length - 54).position;
  return (
    <section className="battle-card" aria-label={t('battlefield.aria')}>
      <div className="battle-head">
        <div>
          <div className="eyebrow"><i className={`live-dot ${snapshot.status === 'wave' && !snapshot.paused ? 'combat' : ''}`} /><span>{phase}</span></div>
          <h1>{levelName(t, engine.level.id)} <span>/ {engine.level.sector}</span></h1>
        </div>
        <div className="incoming">
          <div className="incoming-title">
            <small>{t('battlefield.nextWave')}</small>
            {engine.mode === 'creative' ? (
              <button
                className="creative-signal-toggle"
                aria-expanded={creativePanelOpen}
                aria-controls="creative-signal-panel"
                onClick={() => setCreativePanelOpen((open) => !open)}
              >{t('battlefield.signalConsole')}</button>
            ) : null}
          </div>
          <EnemyPreview engine={engine} wave={snapshot.wave} />
        </div>
      </div>

      {engine.mode === 'creative' && creativePanelOpen ? (
        <div id="creative-signal-panel" className="creative-signal-panel">
          <CreativeLab engine={engine} setup={view.creativeSetup} />
        </div>
      ) : null}

      <div className="canvas-wrap">
        <GameCanvas engine={engine} />
        <div className="spawn-label" style={{ top: `${spawn.y / WORLD.height * 100}%` }}><i /><span>{t('battlefield.spawn')}</span></div>
        <div className="core-label" style={{ top: `${core.y / WORLD.height * 100}%`, bottom: 'auto' }}><span>{t('battlefield.core')}</span><i /></div>
        <div className="battle-tip">
          <span className="tip-key" aria-hidden="true">+</span>
          <div><strong>{t('battlefield.deployTitle')}</strong><small>{engine.mode === 'creative' ? t('battlefield.deployCreative') : t('battlefield.deployStandard', { cost: ECONOMY_BALANCE.towerCost })}</small></div>
        </div>
        {!terminal ? null : (
          <div className="status-overlay" data-tone={snapshot.status}>
            <div className="status-shape">✦</div>
            <h2>{snapshot.status === 'won' ? t('battlefield.won') : t('battlefield.lost')}</h2>
            <p>{snapshot.status === 'won'
              ? t('battlefield.wonDetail', { score: snapshot.score, core: snapshot.core, maxCore: snapshot.maxCore })
              : t('battlefield.lostDetail', { wave: snapshot.wave })}</p>
            <button onClick={() => engine.reset()}>{t('battlefield.recalibrate')}</button>
          </div>
        )}
      </div>

      <footer className="battle-footer">
        <div className="legend">
          <span><i className="tri swatch-yellow" />{t('enemies.spark')}</span>
          <span><i className="square swatch-pink" />{t('enemies.kite')}</span>
          <span><i className="hex swatch-purple" />{t('enemies.hex')}</span>
        </div>
        <div className="score-line">
          <span className="mode-chip">{t(`modes.${snapshot.mode}`)}</span>
          <span className="difficulty-chip">{difficultyName(t, engine.difficulty.id)}</span>
          {t('battlefield.score')} <strong>{String(snapshot.score).padStart(5, '0')}</strong>
        </div>
        <details className="battle-access-controls">
          <summary>{t('battlefield.keyboardControls')}</summary>
          <div>
            {view.towers.map((tower) => (
              <button key={tower.id} onClick={() => engine.selectTower(tower.id)}>{t('battlefield.selectNode', { id: String(tower.id).padStart(2, '0') })}</button>
            ))}
            {engine.level.towerPads.map((_, padIndex) => (
              view.towers.some((tower) => tower.padIndex === padIndex)
                ? null
                : <button key={`pad-${padIndex}`} onClick={() => engine.placeTower(padIndex)}>{t('battlefield.deployNode', { index: padIndex + 1 })}</button>
            ))}
          </div>
        </details>
      </footer>
    </section>
  );
}
