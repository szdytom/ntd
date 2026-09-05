import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { GameSnapshot, GameViewSnapshot } from '@prism-bastion/game-core/game/types';
import { Tag } from '@prism-bastion/web-shared/ui/Tag';
import { EnergyBolt } from '@prism-bastion/web-shared/ui/EnergyBolt';
import { DraftProgress } from '@prism-bastion/web-shared/ui/DraftProgress';
import { ModuleDraftCard } from '@prism-bastion/web-shared/ui/ModuleDraftCard';
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
        <h2>{isInitialDraft ? t('reward.initialTitle') : t('reward.waveTitle')}</h2>
        <div className="reward-heading-meta">
          {draft.boosted ? <Tag tone="yellow">{t('reward.boosted')}</Tag> : null}
          <p>{isInitialDraft
            ? t('reward.foot', { count: draft.totalRounds - draft.round + 1 })
            : t('reward.waveDescription')}</p>
        </div>
      </div>
      {advancedVisible ? <div className="reward-debug-summary" aria-label="F3 draft diagnostics">
        <code className="reward-advanced-inline">s={quality(diagnostics.inventoryAverage)} a={quality(diagnostics.qualityAnchor)} b={quality(diagnostics.computedBaseline)} u=+{quality(diagnostics.appliedBoost)} q={quality(diagnostics.computedQuality)} ({diagnostics.retryCount}/{diagnostics.maxRetry} {diagnostics.highestOfferedQuality}:{diagnostics.abandonedHighestQuality ?? '-'}:{diagnostics.projectileDeficit}:{diagnostics.guaranteedPoolSize})</code>
      </div> : null}
      <div className="reward-head-actions">
        <DraftProgress current={draft.round} total={draft.totalRounds} />
        <button
          className="reward-abandon"
          disabled={!draft.canAbandon}
          aria-label={`${t('reward.abandon', { count: draft.abandonsRemaining })}${draft.canAbandon ? '' : `. ${abandonUnavailable}`}`}
          title={abandonTitle}
          onClick={() => engine.abandonDraft()}
        >{t('reward.abandon', { count: draft.abandonsRemaining })}</button>
      </div>
    </header>
    <div className="reward-grid">{draft.choices.map((moduleId) => {
        const definition = engine.modules.require(moduleId);
        const weight = diagnostics.choiceWeights.find((candidate) => candidate.moduleId === moduleId);
        return <ModuleDraftCard
          key={moduleId}
          definition={definition}
          readouts={[
            { label: t('reward.energy'), value: <>{definition.meta.energy}<EnergyBolt /></> },
            { label: t('reward.inventory'), value: inventory[moduleId]?.total ?? 0 },
          ]}
          onChoose={() => engine.chooseDraftModule(moduleId)}
          {...(onOpenThought ? { onOpenThought } : {})}
          debug={advancedVisible && weight ? <code className="reward-card-debug">
              b={compactWeight(weight.base)} r={compactWeight(weight.recent)} o={compactWeight(weight.ownership)} t={compactWeight(weight.trailCompatibility)} p={compactWeight(weight.projectileCompatibility)} d={compactWeight(weight.dependencyCompatibility)} w={compactWeight(weight.weight)}
            </code> : null}
        />;
      })}</div>
  </section>;
}
