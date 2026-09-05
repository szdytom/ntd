import type { ComponentType } from 'react';

export type CoopFeature = ComponentType<{ onExit: () => void }>;

let featurePromise: Promise<{ default: CoopFeature }> | null = null;

/** Loads code only. A WebSocket can be opened only after the returned component mounts and receives a user action. */
export function loadCoopFeature(): Promise<{ default: CoopFeature }> {
  featurePromise ??= import('./coop-feature').catch((error) => {
    featurePromise = null;
    throw error;
  });
  return featurePromise;
}
