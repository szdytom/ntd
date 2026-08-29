import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './styles.css';
import { App } from './ui/App';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root is missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
