import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  root: path.resolve(import.meta.dirname, 'fixtures/converter'),
  plugins: [react(), tailwind()],
  build: {
    outDir: '../../.cache/browser-harness',
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message.includes('externalized for browser')) {
          throw new Error(warning.message);
        }

        warn(warning);
      },
    },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
