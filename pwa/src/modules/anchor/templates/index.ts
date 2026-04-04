/**
 * Anchor module — Template orchestrator
 *
 * Combines all section templates into the full application HTML.
 * Called from entry.ts to inject into the minimal HTML shell.
 */

export {
  connectionBannerHTML,
  backgroundHTML,
  headerHTML,
  dashboardHTML,
  peerDriftBannerHTML,
  mapWidgetHTML,
  alarmStateBarHTML,
} from './layout';
export { controlsPanelHTML } from './controls';
export { allModalsHTML } from './modals';
export { simpleMonitorHTML, onboardingHTML } from './overlays';

import {
  connectionBannerHTML,
  backgroundHTML,
  headerHTML,
  dashboardHTML,
  peerDriftBannerHTML,
  mapWidgetHTML,
  alarmStateBarHTML,
} from './layout';
import { controlsPanelHTML } from './controls';
import { allModalsHTML } from './modals';
import { simpleMonitorHTML, onboardingHTML } from './overlays';

/**
 * Returns the complete application HTML to be injected into <body>.
 * Preserves the exact DOM structure, IDs, classes, data-* and aria attributes
 * from the original index.html.
 */
export function renderApp(): string {
  return [
    connectionBannerHTML(),
    backgroundHTML(),
    headerHTML(),
    dashboardHTML(),
    peerDriftBannerHTML(),
    mapWidgetHTML(),
    alarmStateBarHTML(),
    controlsPanelHTML(),
    allModalsHTML(),
    simpleMonitorHTML(),
    onboardingHTML(),
  ].join('\n');
}
