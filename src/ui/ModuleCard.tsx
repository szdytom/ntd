import { useRef, type DragEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleDefinition } from '../modules';
import { moduleShortName, rarityLabel } from '../i18n/presentation';
import { KIND_SYMBOL, moduleVariableStyle } from './modulePresentation';
import { EnergyBolt } from './EnergyBolt';
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
  const lastQuickInstallAt = useRef(Number.NEGATIVE_INFINITY);
  const dragStart = (event: DragEvent<HTMLButtonElement>): void => {
    if (exhausted) { event.preventDefault(); return; }
    event.dataTransfer.setData('text/module', definition.id);
    event.dataTransfer.effectAllowed = 'copy';
  };
  const quickInstall = (event: MouseEvent<HTMLButtonElement>): void => {
    if (exhausted || event.timeStamp - lastQuickInstallAt.current < 500) return;
    lastQuickInstallAt.current = event.timeStamp;
    onQuickInstall();
  };
  return (
    <button className={`module-card rarity-${definition.meta.rarity} ${selected ? 'selected' : ''} ${exhausted ? 'exhausted' : ''}`}
      data-tutorial-module={tutorialId}
      data-touch-module={exhausted ? undefined : definition.id}
      style={moduleVariableStyle(definition)} draggable={!exhausted} onDragStart={dragStart} onClick={onSelect}
      onDoubleClick={quickInstall}
      title={exhausted ? t('moduleCard.exhaustedTitle') : t('moduleCard.installTitle')}>
      <span className={`kind-badge ${definition.kind}`}>{KIND_SYMBOL[definition.kind]}</span>
      <span className="rarity-mark">{rarityLabel(t, definition.meta.rarity)}</span>
      <span className="module-symbol"><Icon /></span>
      <span className="module-text"><strong>{moduleShortName(t, definition.id)}</strong>{inventoryLabel
        ? <small>{inventoryLabel}</small>
        : <small className="module-energy">{definition.meta.energy}<EnergyBolt /></small>}</span>
    </button>
  );
}
