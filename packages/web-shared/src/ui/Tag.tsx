import type { HTMLAttributes, ReactNode } from 'react';
import './Tag.css';

export type TagTone = 'neutral' | 'yellow' | 'purple' | 'coral' | 'mint' | 'accent';

export function Tag({
  children,
  className,
  tone = 'neutral',
  borderless = false,
  monospace = false,
  contrast,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: TagTone;
  borderless?: boolean;
  monospace?: boolean;
  contrast?: 'dark' | 'light';
}) {
  const classes = [
    'ui-tag',
    `ui-tag--${tone}`,
    borderless ? 'ui-tag--borderless' : '',
    monospace ? 'ui-tag--monospace' : '',
    contrast ? `ui-tag--${contrast}-text` : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return <span className={classes} {...props}>{children}</span>;
}
