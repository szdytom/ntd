import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@prism-bastion/web-shared/i18n';
import '@prism-bastion/web-shared/styles.css';
import '@prism-bastion/web-shared/module-presentations/icons.css';
import { FullSiteApp } from './FullSiteApp';
import { defenseArchiveRepository } from '@prism-bastion/web-single/defense-archive';
import { configureSettingsArchiveRepository } from '@prism-bastion/web-shared/ui/SettingsPanel';

const root = document.getElementById('app');
if (!root) throw new Error('Missing app root');

configureSettingsArchiveRepository(defenseArchiveRepository);
createRoot(root).render(<StrictMode><FullSiteApp /></StrictMode>);
