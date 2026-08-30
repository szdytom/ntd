import type { DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleDefinition } from '../modules';
import { moduleShortName, rarityLabel } from '../i18n/presentation';
import { KIND_SYMBOL, moduleVariableStyle } from './modulePresentation';
import './ModuleCard.css';

export function ModuleCard({ definition, tutorialId, selected, exhausted, inventoryLabel, onSelect, onQuickInstall }: {
  definition: ModuleDefinition;
  tutorialId?: string;
  selected: boolean;
  exhausted: boolean;
  inventoryLabel: string | undefined;
  onSelect: () => void;
  onQuickInstall: () => void;
}) {
  const { t } = useTranslation();
  const Icon = definition.icon;
  const dragStart = (event: DragEvent<HTMLButtonElement>): void => {
    if (exhausted) { event.preventDefault(); return; }
    event.dataTransfer.setData('text/module', definition.id);
    event.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <button className={`module-card rarity-${definition.meta.rarity} ${selected ? 'selected' : ''} ${exhausted ? 'exhausted' : ''}`}
      data-tutorial-module={tutorialId}
      style={moduleVariableStyle(definition)} draggable={!exhausted} onDragStart={dragStart} onClick={onSelect}
      onDoubleClick={() => { if (!exhausted) onQuickInstall(); }}
      title={exhausted ? t('moduleCard.exhaustedTitle') : t('moduleCard.installTitle')}>
      <span className={`kind-badge ${definition.kind}`}>{KIND_SYMBOL[definition.kind]}</span>
      <span className="rarity-mark">{rarityLabel(t, definition.meta.rarity)}</span>
      <span className="module-symbol"><Icon /></span>
      <span className="module-text"><strong>{moduleShortName(t, definition.id)}</strong><small>{inventoryLabel ?? `${definition.meta.energy} ⚡`}</small></span>
    </button>
  );
}
