import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMIES } from '../game/config';
import type { GameEngine } from '../game/engine';
import { enemyName } from '../i18n/presentation';
import { Tag } from './Tag';
import './EnemyPreview.css';

export function EnemyPreview({ engine, wave }: { engine: GameEngine; wave: number }) {
  const { t } = useTranslation();
  const counts = new Map<string, number>();
  engine.getWaveBlueprint(wave).forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));
  return <div className="enemy-preview">{[...counts.entries()].slice(0, 4).map(([type, count]) => {
    const enemy = ENEMIES[type as keyof typeof ENEMIES];
    const shape = enemy.shape === 'fracture' ? 'fracture' : enemy.shape === 'ring' ? 'ring' : enemy.sides === 3 ? 'tri' : enemy.sides >= 6 ? 'hex' : 'square';
    return <Tag className="enemy-preview-tag" key={type} title={`${enemyName(t, type as keyof typeof ENEMIES)} × ${count}`}><i className={shape} style={{ '--preview-color': enemy.color } as CSSProperties} /><b>×{count}</b></Tag>;
  })}</div>;
}
