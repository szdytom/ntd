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
import styles from './Battlefield.module.css';

export interface BattlefieldUtilityPanel {
  id: string;
  label: string;
  render: (onClose: () => void) => ReactNode;
}

export function Battlefield({ className, engine, backgroundEngine, view, suspended = false, onOpenArchive, utilityPanel, workshop, children }: {
  className?: string;
  engine: GameEngine;
  backgroundEngine?: GameEngine | undefined;
  view: GameViewSnapshot;
  suspended?: boolean;
  onOpenArchive: (type: SignalId) => void;
  utilityPanel?: BattlefieldUtilityPanel;
  workshop?: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [creativePanelOpen, setCreativePanelOpen] = useState(false);
  const [utilityPanelOpen, setUtilityPanelOpen] = useState(false);
  const creativeToggleRef = useRef<HTMLButtonElement>(null);
  const creativePanelRef = useRef<HTMLDivElement>(null);
  const utilityToggleRef = useRef<HTMLButtonElement>(null);
  const utilityPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!creativePanelOpen && !utilityPanelOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (creativePanelRef.current?.contains(target)
        || creativeToggleRef.current?.contains(target)
        || utilityPanelRef.current?.contains(target)
        || utilityToggleRef.current?.contains(target)) return;
      setCreativePanelOpen(false);
      setUtilityPanelOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [creativePanelOpen, utilityPanelOpen]);
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
    <section className={[styles.root, className].filter(Boolean).join(' ')} data-phase={snapshot.status} data-mode={snapshot.mode} aria-label={t('battlefield.aria')}>
      <div className={styles.stage}>
        <div className={styles.header}>
          <div>
            <h1>
              {levelName(t, engine.level.id)}{' '}
              <Tag className={styles.sectorTag} tone="purple" borderless monospace>{engine.level.sector.replace('SECTOR ', '')}</Tag>
              <span className={styles.runIndicator}>· {runIndicator}</span>
            </h1>
          </div>
          <div className={styles.incoming}>
            <div className={styles.incomingTitle}>
              <small>{t(terminal
                ? 'battlefield.noSignals'
                : waveInProgress ? 'battlefield.currentWave' : 'battlefield.nextWave')}</small>
              {engine.rules.scenarioControls === 'creative' ? (
                <button
                  ref={creativeToggleRef}
                  className={styles.creativeSignalToggle}
                  aria-haspopup="dialog"
                  aria-expanded={creativePanelOpen}
                  aria-controls="creative-signal-panel"
                  onClick={() => {
                    setUtilityPanelOpen(false);
                    setCreativePanelOpen((open) => !open);
                  }}
                >{t('battlefield.signalConsole')}</button>
              ) : null}
              {utilityPanel ? <button
                ref={utilityToggleRef}
                className={`${styles.creativeSignalToggle} ${styles.utilityToggle}`}
                aria-haspopup="dialog"
                aria-expanded={utilityPanelOpen}
                aria-controls={utilityPanel.id}
                onClick={() => {
                  setCreativePanelOpen(false);
                  setUtilityPanelOpen((open) => !open);
                }}
              >{utilityPanel.label}</button> : null}
            </div>
            {terminal ? null : (
              <SignalPreview
                className={styles.signalPreview!}
                engine={engine}
                wave={previewWave}
                {...(waveInProgress ? { liveCounts: snapshot.waveSignalCounts } : {})}
                onOpenArchive={onOpenArchive}
              />
            )}
          </div>
        </div>

        {engine.rules.scenarioControls === 'creative' && creativePanelOpen ? (
          <div ref={creativePanelRef} id="creative-signal-panel" className={styles.creativeSignalPanel}>
            <CreativeLab engine={engine} setup={view.creativeSetup} onClose={() => {
              setCreativePanelOpen(false);
              creativeToggleRef.current?.focus();
            }} />
          </div>
        ) : null}
        {utilityPanel && utilityPanelOpen ? <div ref={utilityPanelRef} id={utilityPanel.id} className={styles.creativeSignalPanel}>
          {utilityPanel.render(() => {
            setUtilityPanelOpen(false);
            utilityToggleRef.current?.focus();
          })}
        </div> : null}

        <div className={styles.canvasWrap}>
          <GameCanvas engine={engine} backgroundEngine={backgroundEngine} suspended={suspended} />
          {spawns.map((spawn, index) => (
            <div className={styles.spawnLabel} data-battlefield-spawn key={engine.level.graph.entrances[index]} style={{ top: `${spawn.y / WORLD.height * 100}%` }}>
              <i /><span>{t('battlefield.spawn')}</span>
            </div>
          ))}
          <div className={styles.coreLabel} style={{ top: `${core.y / WORLD.height * 100}%`, bottom: 'auto' }}><span>{t('battlefield.core')}</span><i /></div>
          {!terminal ? null : (
            <div className={styles.statusOverlay} data-tone={snapshot.status}>
              <div className={styles.statusShape}>✦</div>
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

      <footer className={styles.footer}>
        <div className={styles.footerState} data-battlefield-state>
          <i className={styles.liveDot} data-battlefield-live data-combat={snapshot.status === 'wave' && !snapshot.paused || undefined} />
          <span>{phase}</span>
        </div>
        <div className={styles.scoreLine}>
          <Tag className={styles.modeChip} tone="yellow" borderless>{t(`modes.${snapshot.mode}`)}</Tag>
          {engine.difficulty.id === 'normal' ? null : (
            <Tag className={styles.difficultyChip} tone="purple" borderless>{difficultyName(t, engine.difficulty.id)}</Tag>
          )}
          {t('battlefield.score')} <strong>{String(snapshot.score).padStart(5, '0')}</strong>
        </div>
      </footer>
    </section>
  );
}
