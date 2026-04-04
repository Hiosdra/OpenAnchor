import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test as base, type Page, type BrowserContext, type TestInfo } from '@playwright/test';
import { GEO } from './helpers.js';

type LocalStorageEntry = { key: string; value: string };
type CoverageMap = Record<string, unknown>;

const E2E_COVERAGE_ENABLED = process.env.E2E_COVERAGE === 'true';
const E2E_COVERAGE_SESSION_KEY = '__openanchor_e2e_coverage__';
const E2E_COVERAGE_OUTPUT_DIR = join(process.cwd(), '.nyc_output', 'e2e');

function sanitizeFileSegment(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return normalized || 'coverage';
}

function coverageFilePrefix(testInfo: TestInfo): string {
  return sanitizeFileSegment([
    testInfo.project.name,
    ...testInfo.titlePath.slice(1),
    `retry-${testInfo.retry}`,
  ].join('__'));
}

async function readPageCoverage(page: Page): Promise<CoverageMap | null> {
  if (page.isClosed()) return null;

  try {
    return await page.evaluate((sessionKey) => {
      const coverageWindow = window as Window & { __coverage__?: CoverageMap };
      if (coverageWindow.__coverage__ && Object.keys(coverageWindow.__coverage__).length > 0) {
        return coverageWindow.__coverage__;
      }

      const persistedCoverage = sessionStorage.getItem(sessionKey);
      if (!persistedCoverage) return null;

      const parsedCoverage = JSON.parse(persistedCoverage);
      return parsedCoverage && typeof parsedCoverage === 'object'
        ? parsedCoverage as CoverageMap
        : null;
    }, E2E_COVERAGE_SESSION_KEY);
  } catch {
    return null;
  }
}

async function persistContextCoverage(context: BrowserContext, testInfo: TestInfo): Promise<void> {
  if (!E2E_COVERAGE_ENABLED) return;

  const pages = context.pages();
  if (pages.length === 0) return;

  const coveragePayloads = new Set<string>();
  const prefix = coverageFilePrefix(testInfo);
  let fileIndex = 0;

  await mkdir(E2E_COVERAGE_OUTPUT_DIR, { recursive: true });

  for (const page of pages) {
    const coverage = await readPageCoverage(page);
    if (!coverage || Object.keys(coverage).length === 0) continue;

    const serializedCoverage = JSON.stringify(coverage);
    if (!serializedCoverage || serializedCoverage === '{}' || coveragePayloads.has(serializedCoverage)) {
      continue;
    }

    coveragePayloads.add(serializedCoverage);
    await writeFile(
      join(E2E_COVERAGE_OUTPUT_DIR, `${prefix}-${fileIndex}-${randomUUID()}.json`),
      serializedCoverage,
    );
    fileIndex += 1;
  }
}

export type Fixtures = {
  /** Set localStorage entries before navigating to a page */
  setLocalStorage: (url: string, entries: LocalStorageEntry[]) => Promise<Page>;
  /** Grant geolocation permission and set mock coordinates */
  mockGeolocation: (coords?: { latitude: number; longitude: number }) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  context: async ({ context }, use) => {
    if (E2E_COVERAGE_ENABLED) {
      await context.addInitScript(({ sessionKey }) => {
        type NumericCounters = Record<string, number>;
        type BranchCounters = Record<string, number[]>;
        type FileCoverage = {
          path?: string;
          hash?: string;
          statementMap?: unknown;
          fnMap?: unknown;
          branchMap?: unknown;
          s?: NumericCounters;
          f?: NumericCounters;
          b?: BranchCounters;
          bT?: BranchCounters;
        };
        type BrowserCoverageMap = Record<string, FileCoverage>;

        const coverageWindow = window as Window & { __coverage__?: BrowserCoverageMap };

        function mergeCounters(
          first: NumericCounters | undefined,
          second: NumericCounters | undefined,
        ): NumericCounters | undefined {
          if (!first && !second) return undefined;

          const merged = { ...(first ?? {}) };
          for (const [key, value] of Object.entries(second ?? {})) {
            merged[key] = (merged[key] ?? 0) + value;
          }
          return merged;
        }

        function mergeBranchCounters(
          first: BranchCounters | undefined,
          second: BranchCounters | undefined,
        ): BranchCounters | undefined {
          if (!first && !second) return undefined;

          const merged: BranchCounters = { ...(first ?? {}) };
          for (const [key, branchValues] of Object.entries(second ?? {})) {
            const existingValues = merged[key] ?? [];
            merged[key] = branchValues.map(
              (branchValue, index) => (existingValues[index] ?? 0) + branchValue,
            );
          }
          return merged;
        }

        function mergeCoverageMaps(
          first: BrowserCoverageMap | undefined,
          second: BrowserCoverageMap | undefined,
        ): BrowserCoverageMap {
          const merged: BrowserCoverageMap = { ...(first ?? {}) };

          for (const [filename, fileCoverage] of Object.entries(second ?? {})) {
            const existingCoverage = merged[filename];
            if (!existingCoverage) {
              merged[filename] = fileCoverage;
              continue;
            }

            merged[filename] = {
              ...existingCoverage,
              ...fileCoverage,
              s: mergeCounters(existingCoverage.s, fileCoverage.s),
              f: mergeCounters(existingCoverage.f, fileCoverage.f),
              b: mergeBranchCounters(existingCoverage.b, fileCoverage.b),
              bT: mergeBranchCounters(existingCoverage.bT, fileCoverage.bT),
            };
          }

          return merged;
        }

        function loadPersistedCoverage(): void {
          try {
            const persistedCoverage = sessionStorage.getItem(sessionKey);
            if (!persistedCoverage) return;

            const parsedCoverage = JSON.parse(persistedCoverage) as BrowserCoverageMap;
            if (!parsedCoverage || typeof parsedCoverage !== 'object') return;

            coverageWindow.__coverage__ = mergeCoverageMaps(
              parsedCoverage,
              coverageWindow.__coverage__,
            );
          } catch (error) {
            console.warn('[e2e coverage] Failed to restore persisted coverage', error);
          }
        }

        function persistCoverage(): void {
          try {
            if (!coverageWindow.__coverage__ || Object.keys(coverageWindow.__coverage__).length === 0) {
              return;
            }

            const persistedCoverage = sessionStorage.getItem(sessionKey);
            const parsedCoverage = persistedCoverage
              ? JSON.parse(persistedCoverage) as BrowserCoverageMap
              : undefined;

            sessionStorage.setItem(
              sessionKey,
              JSON.stringify(mergeCoverageMaps(parsedCoverage, coverageWindow.__coverage__)),
            );
          } catch (error) {
            console.warn('[e2e coverage] Failed to persist coverage', error);
          }
        }

        loadPersistedCoverage();
        window.addEventListener('beforeunload', persistCoverage);
        window.addEventListener('pagehide', persistCoverage);
      }, { sessionKey: E2E_COVERAGE_SESSION_KEY });
    }

    await use(context);
  },

  page: async ({ page }, use, testInfo) => {
    await use(page);
    await persistContextCoverage(page.context(), testInfo);
  },

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
