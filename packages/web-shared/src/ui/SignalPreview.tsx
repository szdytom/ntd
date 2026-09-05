import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveSpawnEntrances } from '@prism-bastion/game-core/game/config';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { SignalId, GameSnapshot } from '@prism-bastion/game-core/game/types';
import { signalName } from '../i18n/presentation';
import { SIGNAL_IDS, signalRegistry } from '@prism-bastion/game-core/signals';
import { SignalIcon } from './SignalIcon';
import { Tag } from './Tag';
import styles from './SignalPreview.module.css';

export function SignalPreview({ className, engine, wave, liveCounts, onOpenArchive }: {
  className?: string;
  engine: GameEngine;
  wave: number;
  liveCounts?: GameSnapshot['waveSignalCounts'];
  onOpenArchive: (type: SignalId) => void;
}) {
  const { t } = useTranslation();
  const counts = new Map<SignalId, number>();
  engine.getWaveBlueprint(wave).forEach((entry) => {
    const count = resolveSpawnEntrances(entry, engine.level.graph).length;
    counts.set(entry.type, (counts.get(entry.type) ?? 0) + count);
  });
  if (liveCounts) {
    for (const type of counts.keys()) counts.set(type, liveCounts[type] ?? 0);
    for (const type of SIGNAL_IDS) {
      const count = liveCounts[type];
      if (count !== undefined && !counts.has(type)) counts.set(type, count);
    }
  }
  return <div className={[styles.root, className].filter(Boolean).join(' ')} data-signal-preview>{[...counts.entries()].map(([type, count]) => {
    const signal = signalRegistry.require(type);
    const name = signalName(t, type);
    return <button
      className={styles.button}
      key={type}
      type="button"
      onClick={() => onOpenArchive(type)}
      aria-label={t('battlefield.openSignalArchive', { signal: name })}
    >
      <Tag className={styles.tag} tone="accent" contrast="light" style={{ '--tag-accent': signal.visual.color } as CSSProperties} title={`${name} × ${count}`}>
        <SignalIcon type={type} monochrome className={styles.icon!} />
        <b>×{count}</b>
      </Tag>
    </button>;
  })}</div>;
}
