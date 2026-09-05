import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SinglePlayerApp } from '@prism-bastion/web-single';
import { loadCoopFeature, type CoopFeature } from './coop-loader';
import './FullSiteApp.css';

const coopRequested = (): boolean => new URLSearchParams(location.search).get('mode') === 'coop';

export function FullSiteApp() {
  const { t } = useTranslation();
  const [coopMode, setCoopMode] = useState(coopRequested);
  const [Feature, setFeature] = useState<CoopFeature | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const enterCoop = useCallback(() => {
    const url = new URL(location.href);
    url.searchParams.set('mode', 'coop');
    history.pushState(null, '', url);
    setCoopMode(true);
  }, []);
  const exitCoop = useCallback(() => {
    const url = new URL(location.href);
    url.searchParams.delete('mode');
    history.pushState(null, '', url);
    setCoopMode(false);
    setLoadFailed(false);
  }, []);

  useEffect(() => {
    const onPopState = (): void => setCoopMode(coopRequested());
    addEventListener('popstate', onPopState);
    return () => removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!coopMode || Feature) return;
    let active = true;
    setLoadFailed(false);
    void loadCoopFeature().then((module) => { if (active) setFeature(() => module.default); })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [Feature, coopMode]);

  useEffect(() => {
    if (coopMode) return;
    const warm = (): void => { void loadCoopFeature().catch(() => undefined); };
    const timeout = window.setTimeout(warm, 1_500);
    const idle = 'requestIdleCallback' in window
      ? window.requestIdleCallback(warm, { timeout: 1_500 })
      : null;
    return () => {
      window.clearTimeout(timeout);
      if (idle !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle);
    };
  }, [coopMode]);

  if (!coopMode) {
    return <SinglePlayerApp homeActions={<button type="button" className="coop-home-entry" onClick={enterCoop}>{t('coop.entryAction')}</button>} />;
  }
  if (Feature) return <Feature onExit={exitCoop} />;
  if (loadFailed) return <main><p role="alert">{t('coop.loadFailed')}</p><button onClick={() => {
    setLoadFailed(false);
    void loadCoopFeature().then((module) => setFeature(() => module.default)).catch(() => setLoadFailed(true));
  }}>{t('coop.retry')}</button><button onClick={exitCoop}>{t('coop.singlePlayer')}</button></main>;
  return <main aria-busy="true">{t('coop.loading')}</main>;
}
