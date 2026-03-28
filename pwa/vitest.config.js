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
