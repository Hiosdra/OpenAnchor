import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const normalizeBasePath = (basePath?: string): string => {
  if (!basePath) return '/';
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
};

export default defineConfig({
  base: normalizeBasePath(process.env.VITE_BASE_PATH),
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        anchor: resolve(__dirname, 'modules/anchor/index.html'),
        egzamin: resolve(__dirname, 'modules/egzamin/index.html'),
        wachtownik: resolve(__dirname, 'modules/wachtownik/index.html'),
        zeglowanie: resolve(__dirname, 'modules/zeglowanie/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@modules': resolve(__dirname, 'src/modules'),
    },
  },
});
