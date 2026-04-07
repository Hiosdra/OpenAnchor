/**
 * Anchor module — React entry point (MPA)
 */

import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { initBackground } from '../../shared/init-background';

initBackground();

document.documentElement.dataset.theme =
  localStorage.getItem('openanchor-theme') || 'dark';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js')
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);
root.render(<App />);
