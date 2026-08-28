import { useEffect, useState } from 'react';
import type { ToastState } from './useGameState';
import './Toast.css';

export function Toast({ toast }: { toast: ToastState | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  return <div className={`toast ${visible ? 'visible' : ''}`} data-tone={toast?.tone ?? 'info'} role="status" aria-live="polite">{toast?.message}</div>;
}
