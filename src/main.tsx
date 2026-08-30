import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { preloadBloomShaders } from './effects/bloom';
import './i18n';
import './styles.css';
import './modules/icons.css';
import { App } from './ui/App';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root is missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const warmShaders = (): void => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => void preloadBloomShaders(), { timeout: 1_000 });
  } else setTimeout(() => void preloadBloomShaders(), 0);
};
if (document.readyState === 'complete') warmShaders();
else window.addEventListener('load', warmShaders, { once: true });
