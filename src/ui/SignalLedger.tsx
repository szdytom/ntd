import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMIES } from '../game/config';
import type { EnemyType, EnemyVariant } from '../game/types';
import type { SignalStats } from '../defense-archive';
import { enemyName } from '../i18n/presentation';
import { SignalIcon } from './SignalIcon';
import './SignalLedger.css';

const SIGNAL_BASE = [...Object.keys(ENEMIES) as EnemyType[]];
const FRACTURE_INDEX = SIGNAL_BASE.indexOf('fracture');
const ALL_SIGNAL_VARIANTS: EnemyVariant[] = FRACTURE_INDEX < 0
  ? [...SIGNAL_BASE, 'fracture-fragment']
  : [
    ...SIGNAL_BASE.slice(0, FRACTURE_INDEX + 1),
    'fracture-fragment',
    ...SIGNAL_BASE.slice(FRACTURE_INDEX + 1),
  ];

const emptySignal = (variant: EnemyVariant): SignalStats => ({
  variant,
  spawned: 0,
  defeated: 0,
  leaked: 0,
  remaining: 0,
  queued: 0,
  coreDamage: 0,
  purificationRate: 0,
});

const signalColor = (variant: EnemyVariant): string => ENEMIES[signalIconType(variant)].color;

export const signalIconType = (variant: EnemyVariant): EnemyType => (
  variant === 'fracture-fragment' ? 'fracture' : variant
);

export const signalLabel = (
  t: ReturnType<typeof useTranslation>['t'],
  variant: EnemyVariant,
): string => variant === 'fracture-fragment'
  ? t('enemyArchive.fragments.name')
  : enemyName(t, variant as EnemyType);

export function SignalLedger({
  signals,
  includeUnobserved = false,
  emptyState,
}: {
  signals: SignalStats[];
  includeUnobserved?: boolean;
  emptyState?: { title: string; detail: string };
}) {
  const { t } = useTranslation();
  const visibleSignals = includeUnobserved
    ? ALL_SIGNAL_VARIANTS.map((variant) => signals.find((signal) => signal.variant === variant) ?? emptySignal(variant))
    : signals;

  if (visibleSignals.length === 0) return emptyState ? <div className="signal-ledger-empty">
    <strong>{emptyState.title}</strong>
    <span>{emptyState.detail}</span>
  </div> : null;

  return <div className="signal-ledger-grid">{visibleSignals.map((signal) => <article
    className="signal-ledger-card"
    key={signal.variant}
    style={{ '--signal-accent': signalColor(signal.variant) } as CSSProperties}
  >
    <span className="signal-ledger-mark"><SignalIcon type={signalIconType(signal.variant)} monochrome className="signal-ledger-icon" /></span>
    <strong className="signal-ledger-name">{signalLabel(t, signal.variant)}</strong>
    <strong className="signal-ledger-rate">{signal.spawned === 0 ? '—' : `${Math.round(signal.purificationRate * 100)}%`}</strong>
    <div className="signal-ledger-outcomes">
      <span><b>{signal.defeated}</b> {t('defenseArchive.short.defeated')}</span>
      <span aria-hidden="true">·</span>
      <span><b>{signal.leaked}</b> {t('defenseArchive.short.leaked')}</span>
    </div>
  </article>)}</div>;
}
