import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: { output: { codeSplitting: false } },
    lib: {
      entry: '../../packages/engine/src/image-worker.ts',
      formats: ['cjs'],
      fileName: () => 'image-worker.cjs',
    },
  },
});
