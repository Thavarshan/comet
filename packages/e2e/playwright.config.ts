import { createTestConfig } from './src/config.js';

const reportName =
  process.argv
    .find((argument) => argument.startsWith('--project='))
    ?.slice('--project='.length) ?? 'all';
const config = createTestConfig(
  {
    testDir: './tests',
    projects: [
      {
        name: 'desktop',
        testMatch: '**/desktop*.spec.ts',
        outputDir: './test-results/desktop',
      },
      {
        name: 'native-matrix',
        testMatch: '**/matrix.spec.ts',
        outputDir: './test-results/native-matrix',
      },
    ],
  },
  reportName,
);

export default {
  ...config,
  reporter: [
    ...(Array.isArray(config.reporter) ? config.reporter : []),
    ['./src/matrix-reporter.ts'],
  ],
};
