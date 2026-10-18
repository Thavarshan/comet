import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: path.resolve('.cache/vite'),
  test: {
    fsModuleCachePath: path.resolve('.cache/vitest-unit'),
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 15000,
  },
});
