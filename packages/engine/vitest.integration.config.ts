import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: path.resolve('.cache/vite'),
  test: {
    fsModuleCachePath: path.resolve('.cache/vitest-integration'),
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30000,
  },
});
