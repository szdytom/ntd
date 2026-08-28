import { useEffect, useState } from 'react';
import type { GameEngine } from '../game/engine';
import type { GameEvent, GameSnapshot } from '../game/types';

export interface ToastState {
  message: string;
  tone: 'info' | 'good' | 'warn';
  nonce: number;
}

export function useGameState(engine: GameEngine): {
  snapshot: GameSnapshot;
  revision: number;
  toast: ToastState | null;
} {
  const [snapshot, setSnapshot] = useState(() => engine.getSnapshot());
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => engine.subscribe((event: GameEvent) => {
    if (event.type === 'state') setSnapshot({ ...event.snapshot });
    if (event.type === 'tower-selected' || event.type === 'program' || event.type === 'inventory') setRevision((value) => value + 1);
    if (event.type === 'toast') {
      setToast({ message: event.message, tone: event.tone ?? 'info', nonce: Date.now() });
    }
  }), [engine]);

  return { snapshot, revision, toast };
}
