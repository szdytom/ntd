import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '../game/engine';
import type { ShotBlueprint } from '../game/types';
import { moduleShortName } from '../i18n/presentation';
import { moduleUiColor } from './modulePresentation';
import './TriggerNode.css';

export function TriggerNode({ shot, engine }: { shot: ShotBlueprint; engine: GameEngine }) {
  const { t } = useTranslation();
  const definition = engine.modules.require(shot.source);
  return (
    <span className="trigger-node-group">
      <span className="trigger-shot" style={{ '--trace-color': moduleUiColor(definition) } as CSSProperties}>{moduleShortName(t, definition.id)}</span>
      {!shot.trigger ? null : <><b className={`trigger-link ${shot.trigger.type}`}>{t(`triggers.${shot.trigger.type}`)}⌁</b>
        {shot.payload.map((payload, index) => <TriggerNode key={`${payload.source}-${index}`} shot={payload} engine={engine} />)}</>}
    </span>
  );
}
