import { devices } from '@playwright/test';
import { createTestConfig } from './src/config.js';

/**
 * Serve the already-exported HTML, not the Next.js development server.
 *
 * This guarantees the browser exercises the exact files Cloudflare will
 * receive: no SSR, local API, deployment credentials, or runtime builder.
 */
const baseURL = 'http://127.0.0.1:4187';

export default createTestConfig(
  {
    testDir: './tests/site',
    outputDir: './test-results/site',
    webServer: {
      command:
        'python3 -m http.server 4187 --bind 127.0.0.1 ' +
        '--directory ../../apps/site/out',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 30000,
    },
    use: {
      baseURL,
      serviceWorkers: 'block',
    },
    projects: [
      { name: 'site-chromium', use: { ...devices['Desktop Chrome'] } },
    ],
  },
  'site',
);
