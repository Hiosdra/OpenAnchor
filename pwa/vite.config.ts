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
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/leaflet/')) {
            return 'vendor-leaflet';
          }
          if (id.includes('node_modules/jspdf-autotable/')) {
            return 'vendor-jspdf-autotable';
          }
          if (id.includes('node_modules/jspdf/')) {
            return 'vendor-jspdf';
          }
          if (id.includes('node_modules/pdfjs-dist/')) {
            return 'vendor-pdfjs';
          }
          if (id.includes('node_modules/html5-qrcode/')) {
            return 'vendor-html5-qrcode';
          }
          if (id.includes('node_modules/qrcode/')) {
            return 'vendor-qrcode';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-lucide-react';
          }
          if (id.includes('node_modules/lucide/')) {
            return 'vendor-lucide';
          }
          if (id.includes('node_modules/marked/')) {
            return 'vendor-marked';
          }
          if (id.includes('node_modules/html2canvas/')) {
            return 'vendor-html2canvas';
          }
        },
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
