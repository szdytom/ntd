import type { ReactNode } from 'react';

export interface GameConsoleSlots {
  readonly homeActions?: ReactNode;
  readonly battlefieldOverlay?: ReactNode;
  readonly utilityPanel?: ReactNode;
}

export interface GameConsole {
  readonly slots: GameConsoleSlots;
}
