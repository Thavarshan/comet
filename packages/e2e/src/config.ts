import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';

/**
 * Reuse diagnostics and timeouts across desktop and future browser projects.
 * Host projects supply their own test directory, launch URL, and webServer.
 */
export function createTestConfig(
  options: PlaywrightTestConfig = {},
  reportName = 'all',
): PlaywrightTestConfig {
  return defineConfig(
    {
      workers: 1,
      fullyParallel: false,
      timeout: 60000,
      forbidOnly: Boolean(process.env.CI),
      retries: 0,
      reporter: [
        ['list'],
        [
          'html',
          {
            open: 'never',
            outputFolder: `playwright-report/${reportName}/html`,
          },
        ],
        [
          'json',
          { outputFile: `playwright-report/${reportName}/results.json` },
        ],
      ],
      use: {
        actionTimeout: 10000,
        navigationTimeout: 15000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
    },
    options,
  );
}
