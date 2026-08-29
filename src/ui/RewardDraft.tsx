import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '../game/engine';
import type { GameSnapshot, GameViewSnapshot } from '../game/types';
import { kindLabel, moduleDescription, moduleDetail, moduleName, rarityLabel } from '../i18n/presentation';
import { moduleVariableStyle } from './modulePresentation';
import { Tag } from './Tag';
import './RewardDraft.css';

export function RewardDraft({ engine, snapshot, inventory }: { engine: GameEngine; snapshot: GameSnapshot; inventory: GameViewSnapshot['moduleInventory'] }) {
  const { t } = useTranslation();
  const draft = snapshot.draft;
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!draft) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previousFocus?.focus();
  }, [draft?.round]);
  if (!draft) return null;
  const isInitialDraft = snapshot.wave === 0;
  return <section className="reward-panel" ref={panelRef} role="region" aria-label={isInitialDraft ? t('reward.initialAria') : t('reward.waveAria')}>
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
        return <button key={moduleId} className={`reward-card rarity-${definition.meta.rarity}`} style={moduleVariableStyle(definition)} onClick={() => engine.chooseDraftModule(moduleId)}>
          <span className={`reward-kind ${definition.kind}`}>{rarityLabel(t, definition.meta.rarity)} · {kindLabel(t, definition.kind)}</span><b>{definition.meta.symbol}</b>
          <strong>{moduleName(t, definition.id)}</strong>
          <small>{moduleDescription(t, definition)}</small>
          <span className="reward-detail">{moduleDetail(t, definition)}</span>
          <em>{t('reward.owned', { energy: definition.meta.energy, count: inventory[moduleId]?.total ?? 0 })}</em>
        </button>;
      })}</div>
    <footer className="reward-foot">{t('reward.foot', { count: draft.totalRounds - draft.round + 1 })}</footer>
  </section>;
}
