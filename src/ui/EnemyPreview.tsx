import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMIES, resolveSpawnEntrances } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { EnemyType, GameSnapshot } from '../game/types';
import { enemyName } from '../i18n/presentation';
import { Tag } from './Tag';
import './EnemyPreview.css';

export function EnemyPreview({ engine, wave, liveCounts, onOpenArchive }: {
  engine: GameEngine;
  wave: number;
  liveCounts?: GameSnapshot['waveSignalCounts'];
  onOpenArchive: (type: EnemyType) => void;
}) {
  const { t } = useTranslation();
  const counts = new Map<EnemyType, number>();
  engine.getWaveBlueprint(wave).forEach((entry) => {
    const count = resolveSpawnEntrances(entry, engine.level.graph).length;
    counts.set(entry.type, (counts.get(entry.type) ?? 0) + count);
  });
  if (liveCounts) {
    for (const type of counts.keys()) counts.set(type, liveCounts[type] ?? 0);
    for (const type of Object.keys(ENEMIES) as EnemyType[]) {
      const count = liveCounts[type];
      if (count !== undefined && !counts.has(type)) counts.set(type, count);
    }
  }
  return <div className="enemy-preview">{[...counts.entries()].map(([type, count]) => {
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
