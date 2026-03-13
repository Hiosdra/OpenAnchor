import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { GEO } from './helpers.js';

type LocalStorageEntry = { key: string; value: string };

export type Fixtures = {
  /** Set localStorage entries before navigating to a page */
  setLocalStorage: (url: string, entries: LocalStorageEntry[]) => Promise<Page>;
  /** Grant geolocation permission and set mock coordinates */
  mockGeolocation: (coords?: { latitude: number; longitude: number }) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  setLocalStorage: async ({ page }, use) => {
    const helper = async (url: string, entries: LocalStorageEntry[]) => {
      await page.goto(url, { waitUntil: 'commit' });
      for (const { key, value } of entries) {
        await page.evaluate(
          ([k, v]) => localStorage.setItem(k, v),
          [key, value] as const,
        );
      }
      await page.reload({ waitUntil: 'networkidle' });
      return page;
    };
    await use(helper);
  },

  mockGeolocation: async ({ context }, use) => {
    const helper = async (coords = GEO.gdyniaHarbor) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation(coords);
    };
    await use(helper);
  },
});

export { expect } from '@playwright/test';
