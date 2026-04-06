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
        'src/**/types.ts',
        'src/shared/types/**',
        'src/modules/anchor/index.ts',
        'src/modules/anchor/App.tsx',
        'src/modules/anchor/hooks/**',
        'src/modules/anchor/components/**',
        'src/modules/egzamin/index.tsx',
        'src/modules/wachtownik/index.tsx',
        'src/modules/zeglowanie/index.ts',
        'src/modules/zeglowanie/App.tsx',
        'src/modules/zeglowanie/hooks/**',
        'src/modules/zeglowanie/components/**',
        'src/service-worker/sw.ts',
      ],
      thresholds: {
        lines: 50,
        statements: 50,
        functions: 50,
        branches: 50,
      },
    }
  }
});
