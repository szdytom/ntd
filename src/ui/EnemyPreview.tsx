import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMIES } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { EnemyType } from '../game/types';
import { enemyName } from '../i18n/presentation';
import { Tag } from './Tag';
import './EnemyPreview.css';

export function EnemyPreview({ engine, wave, onOpenArchive }: {
  engine: GameEngine;
  wave: number;
  onOpenArchive: (type: EnemyType) => void;
}) {
  const { t } = useTranslation();
  const counts = new Map<EnemyType, number>();
  engine.getWaveBlueprint(wave).forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));
  return <div className="enemy-preview">{[...counts.entries()].slice(0, 4).map(([type, count]) => {
    const enemy = ENEMIES[type];
    const name = enemyName(t, type);
    const shape = enemy.shape === 'fracture' ? 'fracture' : enemy.shape === 'ring' ? 'ring' : enemy.shape === 'surge' ? 'surge' : enemy.shape === 'anvil' ? 'anvil' : enemy.sides === 3 ? 'tri' : enemy.sides >= 6 ? 'hex' : 'square';
    return <button
      className="enemy-preview-button"
      key={type}
      type="button"
      onClick={() => onOpenArchive(type)}
      aria-label={t('battlefield.openSignalArchive', { signal: name })}
    >
      <Tag className="enemy-preview-tag" title={`${name} × ${count}`}>
        <i className={shape} style={{ '--preview-color': enemy.color } as CSSProperties} />
        <b>×{count}</b>
      </Tag>
    </button>;
  })}</div>;
}
