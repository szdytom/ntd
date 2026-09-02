import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WORLD } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { SignalId, GameViewSnapshot } from '../game/types';
import { difficultyName, levelName } from '../i18n/presentation';
import { GameCanvas } from './GameCanvas';
import { SignalPreview } from './SignalPreview';
import { CreativeLab } from './CreativeLab';
import { Tag } from './Tag';
import './Battlefield.css';

export function Battlefield({ engine, view, onOpenArchive, workshop, children }: {
  engine: GameEngine;
  view: GameViewSnapshot;
  onOpenArchive: (type: SignalId) => void;
  workshop?: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [creativePanelOpen, setCreativePanelOpen] = useState(false);
  const creativeToggleRef = useRef<HTMLButtonElement>(null);
  const creativePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!creativePanelOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (creativePanelRef.current?.contains(target) || creativeToggleRef.current?.contains(target)) return;
      setCreativePanelOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [creativePanelOpen]);
  const { game: snapshot } = view;
  const phase = snapshot.status === 'won'
    ? t('battlefield.won')
    : snapshot.status === 'lost'
      ? t('battlefield.lost')
      : snapshot.manuallyPaused
        ? t('battlefield.paused')
        : snapshot.paused
          ? t('battlefield.autoPaused')
          : snapshot.status === 'wave'
            ? t('battlefield.contact')
            : snapshot.status === 'reward'
              ? t('battlefield.intercepting')
              : t('battlefield.planning');
  const terminal = snapshot.status === 'won' || snapshot.status === 'lost';
  const runIndicator = snapshot.mode === 'creative'
    ? t('battlefield.creativeIndicator')
    : difficultyName(t, engine.difficulty.id);
  const waveInProgress = snapshot.status === 'wave';
  const previewWave = waveInProgress ? Math.max(0, snapshot.wave - 1) : snapshot.wave;
  const spawns = engine.level.graph.entrances.map((entrance) => engine.routeFor(entrance).pointAtDistance(44).position);
  const core = engine.getCorePosition();
  return (
    <section className="battle-card" data-phase={snapshot.status} data-mode={snapshot.mode} aria-label={t('battlefield.aria')}>
      <div className="battle-stage">
        <div className="battle-head">
          <div>
            <h1>
              {levelName(t, engine.level.id)}{' '}
              <Tag className="battle-sector-tag" tone="purple" borderless monospace>{engine.level.sector.replace('SECTOR ', '')}</Tag>
              <span className="battle-run-indicator">· {runIndicator}</span>
            </h1>
          </div>
          <div className="incoming">
            <div className="incoming-title">
              <small>{t(terminal
                ? 'battlefield.noSignals'
                : waveInProgress ? 'battlefield.currentWave' : 'battlefield.nextWave')}</small>
              {engine.rules.scenarioControls === 'creative' ? (
                <button
                  ref={creativeToggleRef}
                  className="creative-signal-toggle"
                  aria-haspopup="dialog"
                  aria-expanded={creativePanelOpen}
                  aria-controls="creative-signal-panel"
                  onClick={() => setCreativePanelOpen((open) => !open)}
                >{t('battlefield.signalConsole')}</button>
              ) : null}
            </div>
            {terminal ? null : (
              <SignalPreview
                engine={engine}
                wave={previewWave}
                {...(waveInProgress ? { liveCounts: snapshot.waveSignalCounts } : {})}
                onOpenArchive={onOpenArchive}
              />
            )}
          </div>
        </div>

        {engine.rules.scenarioControls === 'creative' && creativePanelOpen ? (
          <div ref={creativePanelRef} id="creative-signal-panel" className="creative-signal-panel">
            <CreativeLab engine={engine} setup={view.creativeSetup} onClose={() => {
              setCreativePanelOpen(false);
              creativeToggleRef.current?.focus();
            }} />
          </div>
        ) : null}

        <div className="canvas-wrap">
          <GameCanvas engine={engine} />
          {spawns.map((spawn, index) => (
            <div className="spawn-label" key={engine.level.graph.entrances[index]} style={{ top: `${spawn.y / WORLD.height * 100}%` }}>
              <i /><span>{t('battlefield.spawn')}</span>
            </div>
          ))}
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
