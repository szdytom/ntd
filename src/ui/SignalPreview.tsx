import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveSpawnEntrances } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { SignalId, GameSnapshot } from '../game/types';
import { signalName } from '../i18n/presentation';
import { SIGNAL_IDS, signalRegistry } from '../signals';
import { SignalIcon } from './SignalIcon';
import { Tag } from './Tag';
import './SignalPreview.css';

export function SignalPreview({ engine, wave, liveCounts, onOpenArchive }: {
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
  return <div className="signal-preview">{[...counts.entries()].map(([type, count]) => {
    const signal = signalRegistry.require(type);
    const name = signalName(t, type);
    return <button
      className="signal-preview-button"
      key={type}
      type="button"
      onClick={() => onOpenArchive(type)}
      aria-label={t('battlefield.openSignalArchive', { signal: name })}
    >
      <Tag className="signal-preview-tag" tone="accent" contrast="light" style={{ '--tag-accent': signal.visual.color } as CSSProperties} title={`${name} × ${count}`}>
        <SignalIcon type={type} monochrome />
        <b>×{count}</b>
      </Tag>
    </button>;
  })}</div>;
}
