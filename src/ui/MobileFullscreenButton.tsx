import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './MobileFullscreenButton.module.css';

interface LockableScreenOrientation extends ScreenOrientation {
  lock?: (orientation: 'landscape') => Promise<void>;
}

const supportsMobileFullscreen = (): boolean => {
  const coarsePointer = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
  const noHover = globalThis.matchMedia?.('(hover: none)').matches ?? false;
  const mobileInput = coarsePointer || (globalThis.navigator?.maxTouchPoints > 0 && noHover);
  return Boolean(mobileInput && document.documentElement.requestFullscreen);
};

export function MobileFullscreenButton() {
  const { t } = useTranslation();
  const [supported] = useState(supportsMobileFullscreen);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return undefined;
    const timeout = window.setTimeout(() => setError(null), 5_000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  if (!supported) return null;

  const enterFullscreen = async (): Promise<void> => {
    const errors: string[] = [];
    setError(null);

    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        errors.push(t('levelSelect.fullscreenError'));
      }
    }

    const orientation = globalThis.screen?.orientation as LockableScreenOrientation | undefined;
    if (typeof orientation?.lock !== 'function') {
      errors.push(t('levelSelect.orientationError'));
    } else {
      try {
        await orientation.lock('landscape');
      } catch {
        errors.push(t('levelSelect.orientationError'));
      }
    }

    setError(errors.length > 0 ? errors.join(' ') : null);
  };

  return <>
    <button
      type="button"
      className={styles.trigger}
      aria-label={t('levelSelect.enterFullscreen')}
      title={t('levelSelect.enterFullscreen')}
      onClick={() => { void enterFullscreen(); }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
      </svg>
    </button>
    {error ? <div className={styles.error} role="alert">{error}</div> : null}
  </>;
}
