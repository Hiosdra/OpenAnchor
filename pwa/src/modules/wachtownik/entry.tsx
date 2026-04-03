import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js')
      .then((registration) => {
        console.log('[App] ServiceWorker registered successfully:', registration.scope);
        window.setInterval(() => {
          registration.update();
        }, 60_000);
      })
      .catch((error) => {
        console.log('[App] ServiceWorker registration failed:', error);
      });
  });
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
