/**
 * @jest-environment node
 */

import * as path from 'node:path';
import { browserWindows, getMainWindowOptions, getOrCreateMainWindow, mainIsReady } from '@/lib/system/windows';
import { overridePlatform, resetPlatform } from '../utils';
import { mocked } from 'jest-mock';
import { Windows } from '@/enum/windows';

const entryFilePath = '/fake/path';

jest.mock('node:path');

describe.skip('windows', () => {
  beforeAll(() => {
    mainIsReady();
  });

  beforeEach(() => {
    mocked(path.join).mockReturnValue('/fake/path');
    overridePlatform('win32'); // Ensure a default platform for each test
  });

  afterEach(() => {
    resetPlatform();
    jest.resetAllMocks(); // Ensure that mocks are reset after each test
    browserWindows.length = 0; // Reset window array to avoid state leakage
  });

  afterAll(() => {
    resetPlatform();
  });

  describe('getMainWindowOptions()', () => {
    const expectedBase = {
      width: Windows.WIDTH,
      height: Windows.HEIGHT,
      minHeight: Windows.MIN_HEIGHT,
      minWidth: Windows.MIN_WIDTH,
      autoHideMenuBar: true,
      acceptFirstMouse: true,
      backgroundColor: '#ffffff',
      titleBarOverlay: false,
      titleBarStyle: undefined,
      icon: undefined,
      resizable: false,
      webPreferences: {
        preload: undefined,
      },
    };

    test('returns the expected output on Windows', () => {
      overridePlatform('win32');
      expect(getMainWindowOptions()).toEqual(expectedBase);
    });

    test('returns the expected output on Linux', () => {
      overridePlatform('linux');
      expect(getMainWindowOptions()).toEqual(expectedBase);
    });

    const isMacOS = process.platform === 'darwin';

    (isMacOS ? test : test.skip)('returns the expected output on macOS', () => {
      overridePlatform('darwin');
      expect(getMainWindowOptions()).toEqual({
        ...expectedBase,
        titleBarOverlay: true,
        titleBarStyle: 'hiddenInset',
      });
    });
  });

  describe('getOrCreateMainWindow()', () => {
    test('creates a window on first call', async () => {
      expect(browserWindows.length).toBe(0);
      await getOrCreateMainWindow(entryFilePath);
      expect(browserWindows[0]).toBeTruthy();
    });

    test('updates "browserWindows" on "close"', async () => {
      await getOrCreateMainWindow(entryFilePath);
      expect(browserWindows[0]).toBeTruthy();
      (await getOrCreateMainWindow(entryFilePath)).emit('closed');
      expect(browserWindows.length).toBe(0);
    });
  });
});
