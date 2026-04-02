import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@modules': resolve(__dirname, 'src/modules'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'src/main.ts',
        'src/shared/types/index.ts',
        'src/shared/components/**',
        'src/shared/i18n/**',
        'src/modules/anchor/alarm-engine.ts',
        'src/modules/anchor/types.ts',
        'src/modules/anchor/index.ts',
        'src/modules/egzamin/index.tsx',
        'src/modules/wachtownik/index.tsx',
        'src/modules/zeglowanie/index.ts',
        // Newly migrated module UI code – not yet unit-tested (covered by E2E)
        'src/modules/*/entry.*',
        'src/modules/*/App.*',
        'src/modules/anchor/anchor-app.ts',
        'src/modules/anchor/connection-status.ts',
        'src/modules/*/components/**',
        'src/modules/anchor/alert-controller.ts',
        'src/modules/anchor/map-controller.ts',
        'src/modules/anchor/ai-controller.ts',
        'src/modules/anchor/ui-utils.ts',
        'src/modules/dashboard/dashboard-ui.ts',
        'src/modules/wachtownik/utils/pdf-export.ts',
        'src/modules/zeglowanie/briefing.ts',
        'src/modules/zeglowanie/checklists.ts',
        'src/modules/zeglowanie/packing.ts',
        'src/modules/zeglowanie/sections.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90
      }
    }
  }
});
