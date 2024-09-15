/**
 * @jest-environment node
 */

import { app, ipcMain, nativeTheme } from 'electron';
import {
  onReady,
  setupShowWindow,
  setupTitleBarClickMac,
  setupNativeTheme,
  setupGetSystemTheme,
  setupIsDevMode,
  onWindowsAllClosed,
  main,
} from '../../src/main';
import { IpcEvent } from '../../src/enum/ipc-event';
import { isDevMode, getOrCreateMainWindow, configureIpcHandlers, mainIsReady, shouldQuit } from '../../src/lib';
import { overridePlatform } from '../utils';
import { mocked } from 'jest-mock';
import * as path from 'node:path';

jest.mock('node:path');

jest.mock('electron', () => ({
  app: {
    quit: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    name: '',
  },
  BrowserWindow: {
    fromWebContents: jest.fn(),
    getAllWindows: jest.fn().mockReturnValue([]),
  },
  ipcMain: {
    on: jest.fn(),
  },
  nativeTheme: {
    themeSource: 'system',
    shouldUseDarkColors: false,
    on: jest.fn(),
  },
  systemPreferences: {
    getUserDefault: jest.fn(),
  },
}));

jest.mock('../../src/lib', () => ({
  shouldQuit: jest.fn(),
  isDevMode: jest.fn().mockReturnValue(false),
  setupDevTools: jest.fn(),
  getOrCreateMainWindow: jest.fn().mockResolvedValue({}),
  configureIpcHandlers: jest.fn(),
  mainIsReady: jest.fn(),
}));

describe('main.ts', () => {
  beforeEach(() => {
    mocked(path.join).mockReturnValue('/fake/path');
    jest.clearAllMocks();
  });

  describe('onReady', () => {
    it('should set up the application correctly', async () => {
      await onReady();

      expect(isDevMode).toHaveBeenCalled();
      expect(mainIsReady).toHaveBeenCalled();
      expect(getOrCreateMainWindow).toHaveBeenCalled();
      expect(configureIpcHandlers).toHaveBeenCalledWith(ipcMain);
    });
  });

  describe('setupShowWindow', () => {
    it('should set up the IPC handler for showing the window', () => {
      setupShowWindow();

      expect(ipcMain.on).toHaveBeenCalledWith(IpcEvent.SHOW_WINDOW, expect.any(Function));
    });
  });

  describe('setupTitleBarClickMac', () => {
    it('should set up the custom titlebar click handler on macOS', () => {
      overridePlatform('darwin');
      setupTitleBarClickMac();

      expect(ipcMain.on).toHaveBeenCalledWith(IpcEvent.CLICK_TITLEBAR_MAC, expect.any(Function));
    });

    it('should not set up the custom titlebar click handler on non-macOS', () => {
      overridePlatform('win32');
      setupTitleBarClickMac();

      expect(ipcMain.on).not.toHaveBeenCalled();
    });
  });

  describe('setupNativeTheme', () => {
    it('should set up the IPC handler for setting the native theme', () => {
      setupNativeTheme();

      expect(ipcMain.on).toHaveBeenCalledWith(IpcEvent.SET_NATIVE_THEME, expect.any(Function));
    });

    it('should notify renderer if the theme source is "system"', () => {
      setupNativeTheme();

      expect(nativeTheme.on).toHaveBeenCalledWith('updated', expect.any(Function));
    });
  });

  describe('setupGetSystemTheme', () => {
    it('should set up the IPC handler for getting the system theme', () => {
      setupGetSystemTheme();

      expect(ipcMain.on).toHaveBeenCalledWith(IpcEvent.GET_SYSTEM_THEME, expect.any(Function));
    });
  });

  describe('setupIsDevMode', () => {
    it('should set up the IPC handler for checking if it is in dev mode', () => {
      setupIsDevMode();

      expect(ipcMain.on).toHaveBeenCalledWith(IpcEvent.IS_DEV_MODE, expect.any(Function));
    });
  });

  describe('onWindowsAllClosed', () => {
    it('should quit the app on non-macOS platforms', () => {
      overridePlatform('win32');
      onWindowsAllClosed();

      expect(app.quit).toHaveBeenCalled();
    });

    it('should not quit the app on macOS', () => {
      overridePlatform('darwin');
      onWindowsAllClosed();

      expect(app.quit).not.toHaveBeenCalled();
    });
  });

  describe('main', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should quit the app if shouldQuit returns true', () => {
      (shouldQuit as jest.Mock).mockReturnValueOnce(true);
      main();

      expect(app.quit).toHaveBeenCalled();
    });

    it('should set up the app correctly if shouldQuit returns false', () => {
      (shouldQuit as jest.Mock).mockReturnValueOnce(false);
      main();

      expect(app.whenReady).toHaveBeenCalled();
      expect(app.on).toHaveBeenCalledWith('window-all-closed', onWindowsAllClosed);
      expect(app.on).toHaveBeenCalledWith('activate', expect.any(Function));
    });
  });
});
