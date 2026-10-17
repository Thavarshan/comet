import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: 'src/preload/index.ts',
      output: { entryFileNames: 'preload.cjs', codeSplitting: false },
    },
  },
});
