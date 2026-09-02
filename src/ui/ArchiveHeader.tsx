import type { ReactNode } from 'react';
import './ArchiveHeader.css';

export function ArchiveHeader({
  className,
  title,
  backLabel,
  onBack,
  children,
}: {
  className: string;
  title: string;
  backLabel: string;
  onBack: () => void;
  children?: ReactNode;
}) {
  return <header className={`archive-header ${className}`}>
    <button className="archive-back" onClick={onBack} aria-label={backLabel}>
      <span aria-hidden="true">←</span>
    </button>
    <div className="archive-title"><h1>{title}</h1></div>
    {children}
  </header>;
}
