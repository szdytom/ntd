import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '../game/engine';
import type { GameSnapshot, GameViewSnapshot } from '../game/types';
import { kindLabel, moduleDescription, moduleDetail, moduleName, rarityLabel } from '../i18n/presentation';
import { moduleVariableStyle } from './modulePresentation';
import { Tag } from './Tag';
import { thoughtRegistry } from '../thoughts';
import './RewardDraft.css';

export function RewardDraft({ engine, snapshot, inventory, advancedVisible = false, onOpenThought }: {
  engine: GameEngine;
  snapshot: GameSnapshot;
  inventory: GameViewSnapshot['moduleInventory'];
  advancedVisible?: boolean;
  onOpenThought?: (thoughtId: string) => void;
}) {
  const { t } = useTranslation();
  const draft = snapshot.draft;
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!draft) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLButtonElement>('.reward-choose')?.focus();
    return () => previousFocus?.focus();
  }, [draft?.round]);
  if (!draft) return null;
  const isInitialDraft = snapshot.wave === 0;
  const hasFutureOffer = draft.round < draft.totalRounds || snapshot.wave < snapshot.maxWaves - 1;
  const abandonUnavailable = draft.abandonsRemaining === 0
    ? t('reward.abandonUnavailableEmpty')
    : !hasFutureOffer
      ? t('reward.abandonUnavailableFinal')
      : t('reward.abandonUnavailableConsecutive');
  const abandonTitle = draft.canAbandon ? t('reward.abandonHint') : abandonUnavailable;
  const quality = (value: number): string => value.toFixed(2);
  const compactWeight = (value: number): string => value.toFixed(2)
    .replace(/^0\./, '.')
    .replace(/\.00$/, '');
  const diagnostics = draft.diagnostics;
  return <section className={`reward-panel${advancedVisible ? ' advanced' : ''}`} ref={panelRef} role="region" aria-label={isInitialDraft ? t('reward.initialAria') : t('reward.waveAria')}>
    <header className="reward-head">
      <div className="reward-heading">
        <Tag className="reward-kicker" tone="yellow">{isInitialDraft ? t('reward.initialKicker') : t('reward.cleared', { wave: String(snapshot.wave).padStart(2, '0') })}</Tag>
        <h2>{isInitialDraft ? t('reward.initialTitle') : t('reward.waveTitle')}</h2>
        <p>{isInitialDraft
          ? t('reward.initialDescription', { count: draft.totalRounds })
          : t('reward.waveDescription')}</p>
      </div>
      <div className="reward-progress">{Array.from({ length: draft.totalRounds }, (_, index) => <i key={index} className={index < draft.round ? 'active' : ''} />)}<span>{draft.round} / {draft.totalRounds}</span></div>
    </header>
    <div className="reward-grid">{draft.choices.map((moduleId) => {
        const definition = engine.modules.require(moduleId);
        const thought = thoughtRegistry.forModule(moduleId);
        const weight = diagnostics.choiceWeights.find((candidate) => candidate.moduleId === moduleId);
        const Icon = definition.icon;
        return <article key={moduleId} className={`reward-card rarity-${definition.meta.rarity}`} style={moduleVariableStyle(definition)}>
          <header className="reward-card-head">
            <span className="reward-rarity">{rarityLabel(t, definition.meta.rarity)}</span>
            <span className={`reward-kind ${definition.kind}`}>{kindLabel(t, definition.kind)}</span>
          </header>
          <div className="reward-card-primary">
            <span className="reward-icon" aria-hidden="true"><Icon /></span>
            <div className="reward-card-copy">
              <strong>{moduleName(t, definition.id)}</strong>
              <small>{moduleDescription(t, definition)}</small>
            </div>
          </div>
          <span className="reward-detail">{moduleDetail(t, definition)}</span>
          {advancedVisible && weight ? <code className="reward-card-debug">
            b={compactWeight(weight.base)} r={compactWeight(weight.recent)} o={compactWeight(weight.ownership)} t={compactWeight(weight.trailCompatibility)} p={compactWeight(weight.projectileCompatibility)} d={compactWeight(weight.dependencyCompatibility)} w={compactWeight(weight.weight)}
          </code> : null}
          <div className="reward-readouts">
            <span><small>{t('reward.energy')}</small><strong>{definition.meta.energy}<i>⚡</i></strong></span>
            <span><small>{t('reward.inventory')}</small><strong>{inventory[moduleId]?.total ?? 0}</strong></span>
          </div>
          <div className="reward-card-actions">
            {thought && onOpenThought ? <button className="reward-view-thought" onClick={() => onOpenThought(thought.id)}>{t('thoughtIndex.viewThought')}</button> : null}
            <button className="reward-choose" onClick={() => engine.chooseDraftModule(moduleId)}>{t('reward.choose')}</button>
          </div>
        </article>;
      })}</div>
    <footer className="reward-foot">
      <span>{draft.boosted ? <Tag tone="yellow">{t('reward.boosted', { boost: diagnostics.appliedBoost })}</Tag> : null}<span>{t('reward.foot', { count: draft.totalRounds - draft.round + 1 })}</span>{advancedVisible ? <code className="reward-advanced-inline">s={quality(diagnostics.inventoryAverage)} a={quality(diagnostics.qualityAnchor)} b={quality(diagnostics.computedBaseline)} u=+{quality(diagnostics.appliedBoost)} q={quality(diagnostics.computedQuality)} ({diagnostics.retryCount}/{diagnostics.maxRetry} {diagnostics.highestOfferedQuality}:{diagnostics.abandonedHighestQuality ?? '-'}:{diagnostics.projectileDeficit}:{diagnostics.guaranteedPoolSize})</code> : null}</span>
      <button
        className="reward-abandon"
        disabled={!draft.canAbandon}
        aria-label={`${t('reward.abandon', { count: draft.abandonsRemaining })}${draft.canAbandon ? '' : `. ${abandonUnavailable}`}`}
        title={abandonTitle}
        onClick={() => engine.abandonDraft()}
      >{t('reward.abandon', { count: draft.abandonsRemaining })}</button>
    </footer>
  </section>;
}
