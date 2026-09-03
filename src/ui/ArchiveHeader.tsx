import type { ComponentProps, ReactNode } from 'react';
import { SettingsPanel } from './SettingsPanel';
import './ArchiveHeader.css';

export function ArchiveHeader({
  className,
  title,
  backLabel,
  onBack,
  decoration,
  contained = false,
  settings,
}: {
  className?: string;
  title: string;
  backLabel: string;
  onBack: () => void;
  decoration: ReactNode;
  contained?: boolean;
  settings?: ComponentProps<typeof SettingsPanel>;
}) {
  const classes = ['archive-header', contained ? 'archive-header-contained' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return <header className={classes}>
    <button className="archive-back" onClick={onBack} aria-label={backLabel}>
      <span aria-hidden="true">←</span>
    </button>
    <div className="archive-title"><h1>{title}</h1></div>
    <SettingsPanel {...settings} />
    <div className="archive-decoration">{decoration}</div>
  </header>;
}
