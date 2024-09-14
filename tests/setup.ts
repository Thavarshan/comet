/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import { mocked } from 'jest-mock';

global.confirm = jest.fn();

if (!process.env.FIDDLE_VERBOSE_TESTS) {
  jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
  jest.spyOn(global.console, 'info').mockImplementation(() => jest.fn());
  jest.spyOn(global.console, 'log').mockImplementation(() => jest.fn());
  jest.spyOn(global.console, 'warn').mockImplementation(() => jest.fn());
  jest.spyOn(global.console, 'debug').mockImplementation(() => jest.fn());
}
jest.mock('electron', () => require('./mocks/electron'));
jest.mock('fs-extra');

// We want to detect jest sometimes
(global as any).__JEST__ = (global as any).__JEST__ || {};

// Setup for main tests
global.window = global.window || {};
global.document = global.document || { body: {} };
global.fetch = window.fetch = jest.fn();

delete (window as any).localStorage;
(window.localStorage as any) = {};

window.navigator = window.navigator ?? {};
(window.navigator.clipboard as any) = {};

/**
 * Mock these properties twice so that they're available
 * both at the top-level of files and also within the
 * code called in individual tests.
 */
window.localStorage.setItem = jest.fn();
window.localStorage.getItem = jest.fn();
window.localStorage.removeItem = jest.fn();
window.open = jest.fn();
window.navigator.clipboard.readText = jest.fn();
window.navigator.clipboard.writeText = jest.fn();

beforeEach(() => {
  (process.env.JEST as any) = true;
  (process.env.TEST as any) = true;
  document.body.innerHTML = '<div id="app" />';

  mocked(window.localStorage.setItem).mockReset();
  mocked(window.localStorage.getItem).mockReset();
  mocked(window.localStorage.removeItem).mockReset();
  mocked(window.open).mockReset();
});
