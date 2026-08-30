import type { DragEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '../game/engine';
import type { ModuleId } from '../game/types';
import type { ModuleDefinition } from '../modules';
import { moduleDescription, moduleName, moduleShortName } from '../i18n/presentation';
import { KIND_SYMBOL, moduleVariableStyle } from './modulePresentation';
import './ModuleSlot.css';

export function ModuleSlot({ index, isLast, definition, selectedModule, engine }: {
  index: number;
  isLast: boolean;
  definition: ModuleDefinition | undefined;
  selectedModule: ModuleId | null;
  engine: GameEngine;
}) {
  const { t } = useTranslation();
  const Icon = definition?.icon;
  const dragStart = (event: DragEvent<HTMLButtonElement>): void => {
    event.dataTransfer.setData('text/slot', String(index));
    event.dataTransfer.effectAllowed = 'move';
  };
  const drop = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const incoming = event.dataTransfer.getData('text/module');
    const source = event.dataTransfer.getData('text/slot');
    if (incoming) engine.installModule(index, incoming);
    else if (source !== '') engine.swapModules(Number(source), index);
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    engine.swapModules(index, index + (event.key === 'ArrowLeft' ? -1 : 1));
  };
  return (
    <div className="slot-wrap">
      {!definition ? (
        <button className="module-slot empty" data-slot={index} data-tutorial-slot={index}
          onClick={() => { if (selectedModule) engine.installModule(index, selectedModule); }}
          onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }}
          onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')}
          onDrop={drop} aria-label={t('moduleSlot.emptyAria', { slot: index + 1 })}>
          <span>+</span><small>{t('moduleSlot.slot', { slot: index + 1 })}</small>
        </button>
      ) : (
        <div className="filled-slot">
          <button className={`module-slot filled ${definition.kind}`} data-tutorial-slot={index} style={moduleVariableStyle(definition)} draggable
            onDragStart={dragStart} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }}
            onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')} onDrop={drop} onKeyDown={keyDown}
            onClick={() => { if (selectedModule) engine.installModule(index, selectedModule); }}
            aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
            aria-label={t('moduleSlot.filledAria', { slot: index + 1, module: moduleName(t, definition.id) })}
            title={t('moduleSlot.filledTitle', { module: moduleName(t, definition.id), description: moduleDescription(t, definition) })}>
            <span className="slot-kind">{KIND_SYMBOL[definition.kind]}</span><span className="slot-icon">{Icon ? <Icon /> : null}</span><small>{moduleShortName(t, definition.id)}</small>
          </button>
          <button className="slot-remove" onClick={() => engine.installModule(index, null)} aria-label={t('moduleSlot.remove', { slot: index + 1, module: moduleName(t, definition.id) })}>×</button>
        </div>
      )}
      {!isLast ? <span className="flow-arrow">›</span> : null}
    </div>
  );
}
