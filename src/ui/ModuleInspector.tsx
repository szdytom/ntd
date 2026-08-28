import { MODULE_RARITIES, type ModuleDefinition } from '../modules';
import { KIND_LABEL, moduleVariableStyle } from './modulePresentation';
import './ModuleInspector.css';

export function ModuleInspector({ definition }: { definition: ModuleDefinition }) {
  return <div className="module-inspector" style={moduleVariableStyle(definition)}>
    <div className="inspector-symbol">{definition.meta.symbol}</div>
    <div className="inspector-copy">
      <span><i>{KIND_LABEL[definition.kind]}</i><b style={{ color: MODULE_RARITIES[definition.meta.rarity].color }}>{MODULE_RARITIES[definition.meta.rarity].label}</b></span>
      <strong>{definition.meta.name}</strong><small>{definition.meta.description} · {definition.meta.detail}</small>
    </div>
    <div className="inspector-cost"><small>耗能</small><strong>{definition.meta.energy}</strong></div>
  </div>;
}
