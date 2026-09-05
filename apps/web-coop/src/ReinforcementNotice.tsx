import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { CoopLeakedSignal } from '@prism-bastion/coop/types';
import type { SignalId, SignalVariantId } from '@prism-bastion/game-core/game/types';
import { signalVariantName } from '@prism-bastion/web-shared/i18n/presentation';
import { signalRegistry } from '@prism-bastion/game-core/signals';
import { SignalIcon } from '@prism-bastion/web-shared/ui/SignalIcon';
import styles from './ReinforcementNotice.module.css';

export function ReinforcementNotice({ signals }: { signals: readonly CoopLeakedSignal[] }) {
  const { t } = useTranslation();
  const counts = new Map<SignalVariantId, { type: SignalId; count: number }>();
  for (const signal of signals) {
    const current = counts.get(signal.variantId);
    counts.set(signal.variantId, { type: signal.type, count: (current?.count ?? 0) + 1 });
  }

  return <section className={styles.root} role="status" aria-live="assertive" aria-label={t('coop.reinforcementNoticeTitle')}>
    <div className={styles.frame}>
      <p>{t('coop.reinforcementNoticeEyebrow')}</p>
      <h2>{t('coop.reinforcementNoticeTitle')}</h2>
      <strong>{t('coop.reinforcementNoticeSignals')}</strong>
      <div className={styles.signals}>{[...counts].map(([variantId, { type, count }]) => {
        const definition = signalRegistry.require(type);
        const name = signalVariantName(t, variantId);
        return <span
          key={variantId}
          style={{ '--notice-signal': definition.visual.color } as CSSProperties}
          title={`${name} × ${count}`}
        >
          <SignalIcon type={type} monochrome />
          <b>{name}</b>
          <em>×{count}</em>
        </span>;
      })}</div>
    </div>
  </section>;
}
