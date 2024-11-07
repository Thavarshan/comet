/* eslint-disable max-len */
/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  silent: false,
  bail: false,
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!**/*.d.ts', '!**/*constants.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/.*\\.(ts|js)$'],
  coverageReporters: ['json', 'html', 'lcov'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node', 'vue'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@vue/test-utils': '<rootDir>/node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js',
    'radix-vue': '<rootDir>/node_modules/radix-vue/dist/radix-vue.cjs.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^.+\\.(svg|png|jpg|jpeg|gif)$': 'jest-transform-stub',
  },
  resetMocks: false,
  resetModules: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/tests/**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['/.tmp/'],
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.ts?$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$'],
};

export default config;
