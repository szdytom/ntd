import type { KeyboardEvent } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '../game/engine';
import type { GameSnapshot, GameViewSnapshot } from '../game/types';
import { kindLabel, moduleDescription, moduleName, rarityLabel } from '../i18n/presentation';
import { moduleVariableStyle } from './modulePresentation';
import './RewardDraft.css';

export function RewardDraft({ engine, snapshot, inventory }: { engine: GameEngine; snapshot: GameSnapshot; inventory: GameViewSnapshot['moduleInventory'] }) {
  const { t } = useTranslation();
  const draft = snapshot.draft;
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!draft) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previousFocus?.focus();
  }, [draft?.round]);
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  if (!draft) return null;
  const isInitialDraft = snapshot.wave === 0;
  return <div className="reward-backdrop" role="dialog" aria-modal="true" aria-label={isInitialDraft ? t('reward.initialAria') : t('reward.waveAria')}>
    <div className="reward-panel" ref={panelRef} onKeyDown={trapFocus}>
      <div className="reward-kicker">{isInitialDraft ? t('reward.initialKicker') : t('reward.cleared', { wave: String(snapshot.wave).padStart(2, '0') })}</div>
      <h2>{isInitialDraft ? t('reward.initialTitle') : t('reward.waveTitle')}</h2>
      <p>{isInitialDraft ? t('reward.initialDescription') : t('reward.waveDescription')}</p>
      <div className="reward-progress">{Array.from({ length: draft.totalRounds }, (_, index) => <i key={index} className={index < draft.round ? 'active' : ''} />)}<span>{draft.round} / {draft.totalRounds}</span></div>
      <div className="reward-grid">{draft.choices.map((moduleId) => {
        const definition = engine.modules.require(moduleId);
        return <button key={moduleId} className={`reward-card rarity-${definition.meta.rarity}`} style={moduleVariableStyle(definition)} onClick={() => engine.chooseDraftModule(moduleId)}>
          <span className={`reward-kind ${definition.kind}`}>{rarityLabel(t, definition.meta.rarity)} · {kindLabel(t, definition.kind)}</span><b>{definition.meta.symbol}</b>
          <strong>{moduleName(t, definition.id)}</strong><small>{moduleDescription(t, definition.id)}</small><em>{t('reward.owned', { energy: definition.meta.energy, count: inventory[moduleId]?.total ?? 0 })}</em>
        </button>;
      })}</div><div className="reward-foot">{t('reward.foot', { count: draft.totalRounds - draft.round + 1 })}</div>
    </div>
  </div>;
}
