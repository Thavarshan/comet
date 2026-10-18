import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.bundle',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'browser' },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message.includes('externalized for browser')) {
          throw new Error(warning.message);
        }

        warn(warning);
      },
    },
  },
});
