import { WORLD, type LevelDefinition } from '../game/config';
import './LevelMap.css';

export function LevelMap({ level }: { level: LevelDefinition }) {
  return <svg className="level-map" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} aria-hidden="true">
    <polyline points={level.path.map((point) => `${point.x},${point.y}`).join(' ')} />
    {level.towerPads.map((pad, index) => <circle key={index} cx={pad.x} cy={pad.y} r="17" />)}
  </svg>;
}
