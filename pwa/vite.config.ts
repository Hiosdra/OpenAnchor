import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
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
