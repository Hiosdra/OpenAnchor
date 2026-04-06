/**
 * SPA mount/unmount helpers for the Anchor module.
 *
 * The Anchor module is built with vanilla TS controllers and templates.
 * This wrapper integrates it into the React SPA router by managing the
 * lifecycle of the AnchorApp class within a React component.
 */

import { createRoot, type Root } from 'react-dom/client';
import { AnchorShell } from './AnchorShell';
import './styles.css';

let root: Root | null = null;

export function mount(container: HTMLElement): void {
  root = createRoot(container);
  root.render(<AnchorShell />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
