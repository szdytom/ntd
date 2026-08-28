import type { CSSProperties } from 'react';
import { ENEMIES } from '../game/config';
import type { GameEngine } from '../game/engine';
import './EnemyPreview.css';

export function EnemyPreview({ engine, wave }: { engine: GameEngine; wave: number }) {
  const counts = new Map<string, number>();
  engine.getWaveBlueprint(wave).forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));
  return <div className="enemy-preview">{[...counts.entries()].slice(0, 4).map(([type, count]) => {
    const enemy = ENEMIES[type as keyof typeof ENEMIES];
    const shape = enemy.shape === 'star' ? 'star' : enemy.shape === 'ring' ? 'ring' : enemy.sides === 3 ? 'tri' : enemy.sides >= 6 ? 'hex' : 'square';
    return <span key={type} title={`${enemy.name} × ${count}`}><i className={shape} style={{ '--preview-color': enemy.color } as CSSProperties} /><b>×{count}</b></span>;
  })}</div>;
}
