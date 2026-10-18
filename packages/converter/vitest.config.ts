import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.cache/vite',
  test: {
    fsModuleCachePath: '.cache/vitest-unit',
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
  },
});
