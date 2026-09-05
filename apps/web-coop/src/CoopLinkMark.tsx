import styles from './CoopLinkMark.module.css';

export function CoopLinkMark({ className, active = true, variant = 'entry' }: {
  className?: string | undefined;
  active?: boolean;
  variant?: 'entry' | 'lobby' | 'result';
}) {
  return <span
    className={[styles.mark, className].filter(Boolean).join(' ')}
    data-active={active}
    data-variant={variant}
    aria-hidden="true"
  >
    <i className={`${styles.parallel} ${styles.parallelOne}`} />
    <i className={`${styles.parallel} ${styles.parallelTwo}`} />
    <i className={`${styles.diagonal} ${styles.diagonalOne}`} />
    <i className={`${styles.diagonal} ${styles.diagonalTwo}`} />
    <i className={`${styles.terminal} ${styles.terminalLeft}`} />
    <i className={`${styles.terminal} ${styles.terminalRight}`} />
    <i className={styles.bridge} />
  </span>;
}
