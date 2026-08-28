import type { KeyboardEvent } from 'react';
import { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/engine';
import type { GameSnapshot, GameViewSnapshot } from '../game/types';
import { MODULE_RARITIES } from '../modules';
import { KIND_LABEL, moduleVariableStyle } from './modulePresentation';
import './RewardDraft.css';

export function RewardDraft({ engine, snapshot, inventory }: { engine: GameEngine; snapshot: GameSnapshot; inventory: GameViewSnapshot['moduleInventory'] }) {
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
  return <div className="reward-backdrop" role="dialog" aria-modal="true" aria-label={isInitialDraft ? '选择初始模块' : '选择模块奖励'}>
    <div className="reward-panel" ref={panelRef} onKeyDown={trapFocus}>
      <div className="reward-kicker">{isInitialDraft ? 'INITIAL MODULE UPLINK' : `WAVE ${String(snapshot.wave).padStart(2, '0')} CLEARED`}</div>
      <h2>{isInitialDraft ? '选择初始模块' : '截获模块信号'}</h2>
      <p>{isInitialDraft ? '开局补给：连续三轮四选一，为第一波构筑防线。' : '四选一，选择一枚加入库存。'}</p>
      <div className="reward-progress">{Array.from({ length: draft.totalRounds }, (_, index) => <i key={index} className={index < draft.round ? 'active' : ''} />)}<span>{draft.round} / {draft.totalRounds}</span></div>
      <div className="reward-grid">{draft.choices.map((moduleId) => {
        const definition = engine.modules.require(moduleId);
        return <button key={moduleId} className={`reward-card rarity-${definition.meta.rarity}`} style={moduleVariableStyle(definition)} onClick={() => engine.chooseDraftModule(moduleId)}>
          <span className={`reward-kind ${definition.kind}`}>{MODULE_RARITIES[definition.meta.rarity].label} · {KIND_LABEL[definition.kind]}</span><b>{definition.meta.symbol}</b>
          <strong>{definition.meta.name}</strong><small>{definition.meta.description}</small><em>{definition.meta.energy} ⚡ · 已有 {inventory[moduleId]?.total ?? 0}</em>
        </button>;
      })}</div><div className="reward-foot">每次只能选择一个 · 还需选择 {draft.totalRounds - draft.round + 1} 次</div>
    </div>
  </div>;
}
