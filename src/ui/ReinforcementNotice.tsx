import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { CoopLeakedSignal } from '../coop/types';
import type { SignalId } from '../game/types';
import { signalName } from '../i18n/presentation';
import { signalRegistry } from '../signals';
import { SignalIcon } from './SignalIcon';
import styles from './ReinforcementNotice.module.css';

export function ReinforcementNotice({ signals }: { signals: readonly CoopLeakedSignal[] }) {
  const { t } = useTranslation();
  const counts = new Map<SignalId, number>();
  for (const signal of signals) counts.set(signal.type, (counts.get(signal.type) ?? 0) + 1);

  return <section className={styles.root} role="status" aria-live="assertive" aria-label={t('coop.reinforcementNoticeTitle')}>
    <div className={styles.frame}>
      <p>{t('coop.reinforcementNoticeEyebrow')}</p>
      <h2>{t('coop.reinforcementNoticeTitle')}</h2>
      <strong>{t('coop.reinforcementNoticeSignals')}</strong>
      <div className={styles.signals}>{[...counts].map(([type, count]) => {
        const definition = signalRegistry.require(type);
        return <span
          key={type}
          style={{ '--notice-signal': definition.visual.color } as CSSProperties}
          title={`${signalName(t, type)} × ${count}`}
        >
          <SignalIcon type={type} monochrome />
          <b>{signalName(t, type)}</b>
          <em>×{count}</em>
        </span>;
      })}</div>
    </div>
  </section>;
}
