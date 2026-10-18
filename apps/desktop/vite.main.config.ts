import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: () => 'main.cjs',
    },
    rollupOptions: { output: { codeSplitting: false } },
  },
});
