/**
 * SPA mount/unmount helpers for the Wachtownik module.
 *
 * Used by the router to dynamically load this module inside the dashboard
 * without a full page navigation.
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';
import './styles.css';

let root: Root | null = null;

export function mount(container: HTMLElement): void {
  root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
