import type { DragEvent } from 'react';
import { MODULE_RARITIES, type ModuleDefinition } from '../modules';
import { KIND_SYMBOL, moduleVariableStyle } from './modulePresentation';
import './ModuleCard.css';

export function ModuleCard({ definition, selected, exhausted, inventoryLabel, onSelect, onQuickInstall }: {
  definition: ModuleDefinition;
  selected: boolean;
  exhausted: boolean;
  inventoryLabel: string | undefined;
  onSelect: () => void;
  onQuickInstall: () => void;
}) {
  const dragStart = (event: DragEvent<HTMLButtonElement>): void => {
    if (exhausted) { event.preventDefault(); return; }
    event.dataTransfer.setData('text/module', definition.id);
    event.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <button className={`module-card rarity-${definition.meta.rarity} ${selected ? 'selected' : ''} ${exhausted ? 'exhausted' : ''}`}
      style={moduleVariableStyle(definition)} draggable={!exhausted} onDragStart={dragStart} onClick={onSelect}
      onDoubleClick={() => { if (!exhausted) onQuickInstall(); }}
      title={exhausted ? '库存份数已全部装配；拆下后可再次安装' : '双击安装到第一个空槽位'}>
      <span className={`kind-badge ${definition.kind}`}>{KIND_SYMBOL[definition.kind]}</span>
      <span className="rarity-mark">{MODULE_RARITIES[definition.meta.rarity].label}</span>
      <span className="module-symbol">{definition.meta.symbol}</span>
      <span className="module-text"><strong>{definition.meta.shortName}</strong><small>{inventoryLabel ?? `${definition.meta.energy} ⚡`}</small></span>
    </button>
  );
}
