/**
 * @jest-environment node
 */

import { BrowserWindow, app } from 'electron';
import { mocked } from 'jest-mock';

import { IpcEvents } from '../../src/enum/ipc-events';
import { ipcMainManager } from '../../src/ipc';
import {
  main,
  onBeforeQuit,
  onReady,
  onWindowsAllClosed,
  setupShowWindow,
} from '../../src/main';
import { shouldQuit } from '../../src/squirrel';
import { getOrCreateMainWindow } from '../../src/windows';
import { BrowserWindowMock } from '../mocks/browser-window';
import { overridePlatform, resetPlatform } from '../utils';

// Need to mock this out or CI will hit an error due to
// code being run async continuing after the test ends:
// > ReferenceError: You are trying to `import` a file
// > after the Jest environment has been torn down.
jest.mock('getos');

jest.mock('../../src/windows', () => ({
  getOrCreateMainWindow: jest.fn(),
  mainIsReady: jest.fn(),
}));

jest.mock('../../src/about-panel', () => ({
  setupAboutPanel: jest.fn(),
}));

jest.mock('../../src/update', () => ({
  setupUpdates: jest.fn(),
}));

jest.mock('../../src/squirrel', () => ({
  shouldQuit: jest.fn(() => false),
}));

jest.mock('../../src/ipc');

/**
 * This test is very basic and some might say that it's
 * just testing that methods are being called as written.
 * That's mostly true - we just want a simple method
 * for CI to know that the app is still opening a window.
 */
describe('main', () => {
  beforeAll(() => {
    overridePlatform('win32');
  });

  afterAll(() => {
    resetPlatform();
  });

  beforeEach(() => {
    mocked(app.getPath).mockImplementation((name) => name);
  });

  describe('main()', () => {
    it('quits during Squirrel events', () => {
      mocked(shouldQuit).mockReturnValueOnce(true);

      main([]);
      expect(app.quit).toHaveBeenCalledTimes(1);
    });

    it('listens to core events', () => {
      main([]);
      expect(app.on).toHaveBeenCalledTimes(6);
    });
  });

  describe('onBeforeQuit()', () => {
    it('sets up IPC so app can quit if dialog confirmed', () => {
      onBeforeQuit();
      expect(ipcMainManager.send).toHaveBeenCalledWith(IpcEvents.BEFORE_QUIT);
      expect(ipcMainManager.on).toHaveBeenCalledWith(
        IpcEvents.CONFIRM_QUIT,
        app.quit,
      );
    });
  });

  describe('onReady()', () => {
    it('opens a BrowserWindow, sets up updates', async () => {
      await onReady();
      expect(getOrCreateMainWindow).toHaveBeenCalled();
    });
  });

  describe('onWindowsAllClosed()', () => {
    it('quits the app on Windows', () => {
      onWindowsAllClosed();

      expect(app.quit).toHaveBeenCalledTimes(1);
    });

    it('does not quit the app on macOS', () => {
      overridePlatform('darwin');

      onWindowsAllClosed();

      expect(app.quit).toHaveBeenCalledTimes(0);
    });
  });

  describe('setupMenuHandler()', () => {
    it('check if listening on BLOCK_ACCELERATORS', () => {
      expect(ipcMainManager.on).toHaveBeenCalledWith(
        IpcEvents.BLOCK_ACCELERATORS,
        expect.anything(),
      );
    });
  });

  describe('setupShowWindow()', () => {
    beforeEach(() => {
      // Since ipcMainManager is mocked, we can't just .emit to trigger
      // the event. Instead, call the callback as soon as the listener
      // is instantiated.
      mocked(ipcMainManager.on).mockImplementationOnce((
        channel: string,
        callback: (data: Record<string, unknown>) => void
      ) => {
        if (channel === IpcEvents.SHOW_WINDOW) {
          callback({});
        }
        return ipcMainManager;
      });
    });

    it('shows the window', () => {
      const mockWindow = new BrowserWindowMock();
      mocked(BrowserWindow.fromWebContents).mockReturnValue(
        mockWindow as unknown as BrowserWindow,
      );
      setupShowWindow();
      expect(mockWindow.show).toHaveBeenCalled();
    });
  });
});
