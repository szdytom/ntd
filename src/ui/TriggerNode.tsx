import type { CSSProperties } from 'react';
import type { GameEngine } from '../game/engine';
import type { ShotBlueprint } from '../game/types';
import './TriggerNode.css';

const TRIGGER_LABEL = { impact: '命中', timer: '延时', proximity: '接近' } as const;

export function TriggerNode({ shot, engine }: { shot: ShotBlueprint; engine: GameEngine }) {
  const definition = engine.modules.require(shot.source);
  return (
    <span className="trigger-node-group">
      <span className="trigger-shot" style={{ '--trace-color': definition.meta.color } as CSSProperties}>{definition.meta.shortName}</span>
      {!shot.trigger ? null : <><b className={`trigger-link ${shot.trigger.type}`}>{TRIGGER_LABEL[shot.trigger.type]}⌁</b>
        {shot.payload.map((payload, index) => <TriggerNode key={`${payload.source}-${index}`} shot={payload} engine={engine} />)}</>}
    </span>
  );
}
