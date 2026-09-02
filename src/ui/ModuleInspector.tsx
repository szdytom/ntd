import { MODULE_RARITIES, type ModuleDefinition } from '../modules';
import { useTranslation } from 'react-i18next';
import { kindLabel, moduleDescription, moduleDetail, moduleName, rarityLabel } from '../i18n/presentation';
import { moduleVariableStyle } from './modulePresentation';
import './ModuleInspector.css';

export function ModuleInspector({ definition, onOpenThought }: { definition: ModuleDefinition; onOpenThought?: () => void }) {
  const { t } = useTranslation();
  const Icon = definition.icon;
  return <div className="module-inspector" style={moduleVariableStyle(definition)}>
    <div className="inspector-summary">
      <div className="inspector-symbol"><Icon /></div>
      <div className="inspector-copy">
        <div className="inspector-meta">
          <span>{kindLabel(t, definition.kind)}</span>
          <b style={{ color: MODULE_RARITIES[definition.meta.rarity].color }}>{rarityLabel(t, definition.meta.rarity)}</b>
        </div>
        <h3>{moduleName(t, definition.id)}</h3>
      </div>
      <div className="inspector-cost"><small>{t('inspector.energy')}</small><strong>{definition.meta.energy}<span aria-hidden="true">⚡</span></strong></div>
    </div>
    <p className="inspector-description">{moduleDescription(t, definition)}</p>
    <p className="inspector-detail">{moduleDetail(t, definition)}</p>
    {onOpenThought ? <button className="inspector-thought" onClick={onOpenThought}>{t('thoughtIndex.viewThought')}</button> : null}
  </div>;
}
