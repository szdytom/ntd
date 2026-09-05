import { useTranslation } from 'react-i18next';
import './DraftProgress.css';

export function DraftProgress({ current, total, className }: {
  current: number;
  total: number;
  className?: string | undefined;
}) {
  const { t } = useTranslation();
  const classes = ['draft-progress', className ?? ''].filter(Boolean).join(' ');
  return <div
    className={classes}
    role="progressbar"
    aria-label={t('reward.progress')}
    aria-valuemin={1}
    aria-valuemax={total}
    aria-valuenow={current}
  >
    {Array.from({ length: total }, (_, index) => <i key={index} className={index < current ? 'active' : ''} />)}
    <span>{current} / {total}</span>
  </div>;
}
