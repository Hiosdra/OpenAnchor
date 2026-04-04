import { defineConfig, devices } from '@playwright/test';

const isDev = process.env.E2E_DEV === 'true';
const isCoverageRun = process.env.E2E_COVERAGE === 'true';
const host = isCoverageRun ? '127.0.0.1' : 'localhost';
const port = isDev ? 5173 : isCoverageRun ? 8082 : 8081;
const webServerCommand = isDev
  ? 'npm run dev -- --port 5173'
  : isCoverageRun
    ? `npx tsc --noEmit -p src/service-worker/tsconfig.json && npx vite build && npx vite preview --host ${host} --port ${port}`
    : `npm run build && npx vite preview --host ${host} --port ${port}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results/artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? '50%' : undefined,
  timeout: 15_000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-results/html', open: 'never' }],
  ],

  use: {
    baseURL: `http://${host}:${port}`,
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: webServerCommand,
    env: {
      ...process.env,
      ...(isCoverageRun ? { VITE_COVERAGE: 'true' } : {}),
    },
    port,
    reuseExistingServer: isCoverageRun ? false : !process.env.CI,
  },
});
