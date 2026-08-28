import { useEffect, useState, useSyncExternalStore } from 'react';
import type { GameEngine } from '../game/engine';
import type { GameEvent, GameViewSnapshot } from '../game/types';

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

  useEffect(() => engine.subscribe((event: GameEvent) => {
    if (event.type === 'toast') {
      setToast({ message: event.message, tone: event.tone ?? 'info', nonce: Date.now() });
    }
  }), [engine]);

  return { view, toast };
}
