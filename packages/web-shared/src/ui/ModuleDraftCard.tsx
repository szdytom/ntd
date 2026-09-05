import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleDefinition } from '@prism-bastion/game-core/modules';
import { modulePresentationRegistry } from '@prism-bastion/web-shared/module-presentations';
import { kindLabel, moduleDescription, moduleDetail, moduleName, rarityLabel } from '@prism-bastion/web-shared/i18n/presentation';
import { thoughtRegistry } from '@prism-bastion/web-shared/thoughts';
import { moduleVariableStyle } from './modulePresentation';
import styles from './ModuleDraftCard.module.css';

export interface ModuleDraftCardReadout {
  label: string;
  value: ReactNode;
}

export function ModuleDraftCard({
  definition,
  readouts,
  onChoose,
  onOpenThought,
  chooseDisabled = false,
  density = 'default',
  selected = false,
  dimmed = false,
  debug,
}: {
  definition: ModuleDefinition;
  readouts: readonly ModuleDraftCardReadout[];
  onChoose: () => void;
  onOpenThought?: (thoughtId: string) => void;
  chooseDisabled?: boolean;
  density?: 'default' | 'compact';
  selected?: boolean;
  dimmed?: boolean;
  debug?: ReactNode;
}) {
  const { t } = useTranslation();
  const compact = density === 'compact';
  const thought = thoughtRegistry.forModule(definition.id);
  const Icon = modulePresentationRegistry.require(definition.id).icon;
  const rootClass = compact
    ? [styles.draftCard, selected ? styles.selectedCard : '', dimmed ? styles.dimmedCard : ''].filter(Boolean).join(' ')
    : `reward-card rarity-${definition.meta.rarity}`;

  return <article className={rootClass} style={moduleVariableStyle(definition)}>
    <header className={compact ? styles.header : 'reward-card-head'}>
      <span className={compact ? styles.rarity : 'reward-rarity'}>{rarityLabel(t, definition.meta.rarity)}</span>
      <span className={compact ? styles.kind : `reward-kind ${definition.kind}`}>{kindLabel(t, definition.kind)}</span>
    </header>
    <div className={compact ? styles.primary : 'reward-card-primary'}>
      <span className={compact ? styles.icon : 'reward-icon'} aria-hidden="true"><Icon /></span>
      <div className={compact ? styles.copy : 'reward-card-copy'}>
        <strong>{moduleName(t, definition.id)}</strong>
        <small>{moduleDescription(t, definition)}</small>
      </div>
      {debug}
    </div>
    <p className={compact ? styles.detail : 'reward-detail'}>{moduleDetail(t, definition)}</p>
    <div
      className={compact ? styles.readouts : 'reward-readouts'}
      style={{ gridTemplateColumns: `repeat(${readouts.length}, minmax(0, 1fr))` }}
    >{readouts.map((readout) => <span key={readout.label}>
      <small>{readout.label}</small><strong>{readout.value}</strong>
    </span>)}</div>
    <div className={compact ? styles.actions : 'reward-card-actions'}>
      {thought && onOpenThought ? <button
        className={compact ? styles.thoughtButton : 'reward-view-thought'}
        onClick={() => onOpenThought(thought.id)}
      >{t('thoughtIndex.viewThought')}</button> : null}
      <button
        className={compact ? styles.chooseButton : 'reward-choose'}
        disabled={chooseDisabled}
        onClick={onChoose}
      >{t('reward.choose')}</button>
    </div>
  </article>;
}
