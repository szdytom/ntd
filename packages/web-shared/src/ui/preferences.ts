import { useSyncExternalStore } from 'react';

export const AUTO_PAUSE_STORAGE_KEY = 'prism-bastion-auto-pause';

const autoPauseEvents = new EventTarget();

export const getAutoPauseEnabled = (): boolean => {
  try {
    return globalThis.localStorage?.getItem(AUTO_PAUSE_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
};

export const setAutoPauseEnabled = (enabled: boolean): void => {
  try {
    globalThis.localStorage?.setItem(AUTO_PAUSE_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
  autoPauseEvents.dispatchEvent(new Event('change'));
};

const subscribeToAutoPause = (listener: () => void): (() => void) => {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === AUTO_PAUSE_STORAGE_KEY) listener();
  };
  autoPauseEvents.addEventListener('change', listener);
  globalThis.addEventListener?.('storage', onStorage);
  return () => {
    autoPauseEvents.removeEventListener('change', listener);
    globalThis.removeEventListener?.('storage', onStorage);
  };
};

export const useAutoPauseEnabled = (): boolean => useSyncExternalStore(
  subscribeToAutoPause,
  getAutoPauseEnabled,
  () => true,
);
