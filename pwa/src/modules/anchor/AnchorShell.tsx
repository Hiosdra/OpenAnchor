/**
 * AnchorShell — React wrapper around the vanilla TypeScript Anchor module.
 *
 * Renders the template HTML into a ref and bootstraps the AnchorApp class,
 * preserving all existing controller logic while enabling SPA routing.
 */

import { useEffect, useRef } from 'react';
import { renderApp } from './templates';
import { ConnectionStatus } from './connection-status';
import { I18N } from './i18n';
import { OnboardingController } from './ui-utils';
import { AnchorApp } from './anchor-app';

export function AnchorShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<AnchorApp | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Inject all application HTML into the container
    el.innerHTML = renderApp();

    // Initialize lucide icons if available
    if (typeof window !== 'undefined' && (window as any).lucide?.createIcons) {
      (window as any).lucide.createIcons();
    }

    // Initialize subsystems
    ConnectionStatus.init();
    new OnboardingController();

    const app = new AnchorApp();
    appRef.current = app;

    // Expose app globally for cross-module access (SyncController, AlertController)
    Object.defineProperty(window, 'app', {
      value: app,
      writable: false,
      configurable: true, // configurable so cleanup can remove it
    });

    // Apply i18n to all static DOM elements
    I18N._applyToDOM();

    return () => {
      // Cleanup on unmount (SPA navigation away)
      if (appRef.current) {
        // Stop GPS watching
        if (appRef.current.gpsCtrl) {
          appRef.current.gpsCtrl.cleanupGPS();
        }
        // Stop alarm sounds
        if (appRef.current.alertCtrl) {
          appRef.current.alertCtrl.cleanup();
        }
        // Disconnect WebSocket
        if (appRef.current.syncCtrl) {
          appRef.current.syncCtrl.disconnect('unmount');
        }
        // Clear intervals
        if ((appRef.current as any)._tickInterval) {
          clearInterval((appRef.current as any)._tickInterval);
        }
        if ((appRef.current as any)._smClockInterval) {
          clearInterval((appRef.current as any)._smClockInterval);
        }
        // Flush remaining track points
        if (appRef.current.sessionCtrl) {
          appRef.current.sessionCtrl.flushTrackPoints().catch(() => {});
        }
        appRef.current = null;
      }

      // Clean up window.app
      try {
        delete (window as any).app;
      } catch {
        // Property may not be configurable in all environments
      }

      // Clear the DOM
      if (el) el.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} id="app-root" className="flex flex-col min-h-screen" />;
}
