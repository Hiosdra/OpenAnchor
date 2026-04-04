import type { Page } from '@playwright/test';
import { EGZAMIN_PDF_TEST_HOOK } from '../src/modules/egzamin/pdf-test-hook';

/** Module URL paths (SPA hash routes for egzamin/wachtownik, full-page for anchor) */
export const MODULES = {
  dashboard: '/',
  anchor: '/modules/anchor/',
  egzamin: '/#/egzamin',
  wachtownik: '/#/wachtownik',
} as const;

/** Common localStorage keys used across the app */
export const STORAGE_KEYS = {
  betaMode: 'oa_beta_mode',
  learnPosition: 'openanchor_learn_position',
  sailingSchedule: 'sailingSchedulePro',
} as const;

/** Mock geolocation coordinates */
export const GEO = {
  gdyniaHarbor: { latitude: 54.5189, longitude: 18.5305 },
  gdanskPort: { latitude: 54.3520, longitude: 18.6466 },
} as const;

/** Polish UI strings used across anchor module tests */
export const ANCHOR_STRINGS = {
  dropAnchor: 'Rzuć Kotwicę',
  searching: 'Szukam...',
  sector: 'SEKTOR',
  meters: 'METRY',
  behind: 'Z tyłu',
} as const;

const EGZAMIN_PLACEHOLDER_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

export async function installEgzaminPdfTestHook(page: Page): Promise<void> {
  await page.addInitScript(
    ({ hookKey, placeholderPng }) => {
      const testWindow = window as Window & {
        [key: string]: {
          forceReady?: boolean;
          renderQuestion?: () => Promise<string>;
        };
      };

      testWindow[hookKey] = {
        forceReady: true,
        renderQuestion: async () => placeholderPng,
      };
    },
    {
      hookKey: EGZAMIN_PDF_TEST_HOOK,
      placeholderPng: EGZAMIN_PLACEHOLDER_PNG,
    },
  );
}
