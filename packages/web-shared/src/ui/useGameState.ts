import { useEffect, useState, useSyncExternalStore } from 'react';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { GameEvent, GameViewSnapshot } from '@prism-bastion/game-core/game/types';
import { useTranslation } from 'react-i18next';
import { moduleName } from '../i18n/presentation';

export interface ToastState {
  message: string;
  tone: 'info' | 'good' | 'warn';
  nonce: number;
}

export function useGameState(engine: GameEngine): {
  view: GameViewSnapshot;
  toast: ToastState | null;
} {
  const view = useSyncExternalStore(engine.subscribeView, engine.getViewSnapshot, engine.getViewSnapshot);
  const [toast, setToast] = useState<ToastState | null>(null);
  const { t } = useTranslation();

  useEffect(() => engine.subscribe((event: GameEvent) => {
    if (event.type === 'notice') {
      const values = event.notice.key === 'toast.moduleAcquired' && typeof event.notice.values?.module === 'string'
        ? { ...event.notice.values, module: moduleName(t, event.notice.values.module) }
        : event.notice.values;
      setToast({ message: values ? t(event.notice.key, values) : t(event.notice.key), tone: event.notice.tone ?? 'info', nonce: Date.now() });
    }
  }), [engine, t]);

  return { view, toast };
}
