/**
 * OpenAnchor PWA - Main entry point (Vite)
 *
 * Initializes the dashboard: theme, SW updates, PWA install banner, module navigation.
 * Sets up the SPA router for in-page module loading.
 */

import { initDashboard } from './modules/dashboard/dashboard-ui';
import { await_router_ref } from './modules/dashboard/index';
import { initRouter, navigateToModule } from './router';

initDashboard();

// Wire up the SPA router
const outlet = document.getElementById('router-outlet');
const dashboardEl = document.getElementById('dashboard-content');
const loadingEl = document.getElementById('router-loading');

if (outlet && dashboardEl && loadingEl) {
  initRouter({
    outlet,
    dashboardEl,
    loadingEl,
    routes: [
      {
        path: '/egzamin',
        loader: () => import('./modules/egzamin/spa-mount'),
      },
      {
        path: '/wachtownik',
        loader: () => import('./modules/wachtownik/spa-mount'),
      },
    ],
  });

  // Allow openModule() to route through the SPA router
  await_router_ref.navigateToModule = navigateToModule;
}
