import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WORLD } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { GameViewSnapshot } from '../game/types';
import { difficultyName, levelName } from '../i18n/presentation';
import { GameCanvas } from './GameCanvas';
import { EnemyPreview } from './EnemyPreview';
import { CreativeLab } from './CreativeLab';
import { Tag } from './Tag';
import './Battlefield.css';

export function Battlefield({ engine, view, workshop, children }: {
  engine: GameEngine;
  view: GameViewSnapshot;
  workshop?: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [creativePanelOpen, setCreativePanelOpen] = useState(false);
  const { game: snapshot } = view;
  const phase = snapshot.status === 'won'
    ? t('battlefield.won')
    : snapshot.status === 'lost'
      ? t('battlefield.lost')
      : snapshot.status === 'wave'
        ? t('battlefield.contact')
        : snapshot.status === 'reward'
          ? t('battlefield.intercepting')
          : snapshot.paused ? t('battlefield.paused') : t('battlefield.planning');
  const terminal = snapshot.status === 'won' || snapshot.status === 'lost';
  const spawn = engine.path.pointAtDistance(44).position;
  const core = engine.path.pointAtDistance(engine.path.length).position;
  return (
    <section className="battle-card" data-phase={snapshot.status} aria-label={t('battlefield.aria')}>
      <div className="battle-stage">
        <div className="battle-head">
          <div>
            <h1>{levelName(t, engine.level.id)} <Tag className="battle-sector-tag" tone="purple" borderless monospace>{engine.level.sector.replace('SECTOR ', '')}</Tag></h1>
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
          {children}
        </div>

        {workshop}
      </div>

      <footer className="battle-footer">
        <div className="battle-footer-state">
          <i className={`live-dot ${snapshot.status === 'wave' && !snapshot.paused ? 'combat' : ''}`} />
          <span>{phase}</span>
        </div>
        <div className="score-line">
          <Tag className="mode-chip" tone="yellow" borderless>{t(`modes.${snapshot.mode}`)}</Tag>
          {engine.difficulty.id === 'normal' ? null : (
            <Tag className="difficulty-chip" tone="purple" borderless>{difficultyName(t, engine.difficulty.id)}</Tag>
          )}
          {t('battlefield.score')} <strong>{String(snapshot.score).padStart(5, '0')}</strong>
        </div>
      </footer>
    </section>
  );
}
