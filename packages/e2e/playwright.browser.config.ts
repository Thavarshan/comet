import { devices } from '@playwright/test';
import { createTestConfig } from './src/config.js';

const baseURL = process.env.HONEYMELON_E2E_WEB_URL ?? 'http://127.0.0.1:4173';

export default createTestConfig(
  {
    testDir: './tests/browser',
    outputDir: './test-results/browser',
    ...(process.env.HONEYMELON_E2E_WEB_URL
      ? {}
      : {
          webServer: {
            command: 'vite preview --config vite.harness.config.ts',
            url: baseURL,
            reuseExistingServer: false,
            timeout: 30000,
          },
        }),
    use: { baseURL, serviceWorkers: 'block' },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],
  },
  'browser',
);
