import { defineConfig, devices } from '@playwright/test';

const isDev = process.env.E2E_DEV === 'true';
const port = isDev ? 5173 : 8081;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results/artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-results/html', open: 'never' }],
  ],

  use: {
    baseURL: `http://localhost:${port}`,
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
    command: isDev ? 'npm run dev -- --port 5173' : 'npm run build && npx vite preview --port 8081',
    port,
    reuseExistingServer: !process.env.CI,
  },
});
