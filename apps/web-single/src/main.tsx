import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { preloadBloomShaders } from '@prism-bastion/web-shared/effects/bloom';
import '@prism-bastion/web-shared/i18n';
import '@prism-bastion/web-shared/styles.css';
import '@prism-bastion/web-shared/module-presentations/icons.css';
import { SinglePlayerApp } from './App';
import { defenseArchiveRepository } from './defense-archive';
import { configureSettingsArchiveRepository } from '@prism-bastion/web-shared/ui/SettingsPanel';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root is missing');

configureSettingsArchiveRepository(defenseArchiveRepository);

createRoot(root).render(
  <StrictMode>
    <SinglePlayerApp />
  </StrictMode>,
);

const warmShaders = (): void => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => void preloadBloomShaders(), { timeout: 1_000 });
  } else setTimeout(() => void preloadBloomShaders(), 0);
};
if (document.readyState === 'complete') warmShaders();
else window.addEventListener('load', warmShaders, { once: true });
