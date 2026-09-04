import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './styles.css';
import './modules/icons.css';
import { CoopApp } from './ui/CoopApp';

const root = document.getElementById('app');
if (!root) throw new Error('Missing app root');

createRoot(root).render(<StrictMode><CoopApp /></StrictMode>);
