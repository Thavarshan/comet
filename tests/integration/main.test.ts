import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';

jest.mock('electron', () => ({
  app: {
    on: jest.fn(),
    quit: jest.fn(),
    setName: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    once: jest.fn((event, callback) => {
      if (event === 'ready-to-show') {
        callback(); // immediately invoke the callback
      }
    }),
    show: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
    },
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
  },
  dialog: {
    showErrorBox: jest.fn(),
    showOpenDialog: jest.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  },
  globalShortcut: {
    register: jest.fn(),
  },
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(() => '/usr/local/bin/ffmpeg'),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  chmodSync: jest.fn(),
}));

jest.mock('fluent-ffmpeg', () => {
  const mFfmpeg = jest.fn(() => ({
    toFormat: jest.fn().mockReturnThis(),
    on: jest.fn(function (this: any, event: string, callback: any) {
      if (event === 'progress') {
        callback({ percent: 50 });
      }
      if (event === 'end') {
        callback();
      }
      return this;
    }),
    save: jest.fn(),
    setFfmpegPath: jest.fn(), // Add the 'setFfmpegPath' property
  }));
  return mFfmpeg;
});

describe('Main Process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a BrowserWindow with the correct properties', () => {
    require('../../src/main');

    const createWindowSpy = (app.on as jest.Mock).mock.calls.find(
      ([event]: [string]) => event === 'ready'
    )?.[1];

    if (createWindowSpy) {
      createWindowSpy();

      expect(BrowserWindow).toHaveBeenCalledWith({
        title: 'Comet | Video Converter',
        icon: path.join(__dirname, '../../src', 'assets', 'images', 'icon', 'icon.png'),
        width: 700,
        height: 600,
        resizable: false,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, '../../src/', 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Access the mock instance of BrowserWindow
      const mainWindowInstance = (BrowserWindow as unknown as jest.Mock).mock.instances[0];

      // Now, verify that the loadURL and once methods are called correctly
      expect(mainWindowInstance.loadURL).toHaveBeenCalledWith(expect.any(String));
      expect(mainWindowInstance.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
    }
  });

  it('should handle dialog:selectDirectory IPC call', async () => {
    require('../../src/main');

    const handlerSelectDirectory = (ipcMain.handle as jest.MockedFunction<typeof ipcMain.handle>).mock.calls.find(
      ([channel]: [string, jest.MockedFunction<any>]) => channel === 'dialog:selectDirectory'
    )?.[1];

    const mockEvent = {
      sender: {
        send: jest.fn(),
      },
    };

    const result = await handlerSelectDirectory?.(mockEvent as unknown as Electron.IpcMainInvokeEvent);

    expect(dialog.showOpenDialog).toHaveBeenCalledWith({ properties: ['openDirectory'] });
    expect(result).toBeNull();
  });

  it('should handle convert-video IPC call', async () => {
    require('../../src/main');

    const handlerConvertVideo = (ipcMain.handle as jest.MockedFunction<typeof ipcMain.handle>).mock.calls.find(
      ([channel]: [string, jest.MockedFunction<any>]) => channel === 'convert-video'
    )?.[1];

    const mockEvent = {
      sender: {
        send: jest.fn(),
      },
    };

    await handlerConvertVideo?.(mockEvent as unknown as Electron.IpcMainInvokeEvent, {
      filePath: '/path/to/file.mp4',
      outputFormat: 'avi',
      saveDirectory: '/save/here',
    });

    expect(mockEvent.sender.send).toHaveBeenCalledWith('conversion-progress', expect.any(Object));
    expect(mockEvent.sender.send).not.toHaveBeenCalledWith('conversion-error', expect.any(String));
  });

  it('should quit the app when all windows are closed', () => {
    require('../../src/main');

    const windowAllClosedCallback = (app.on as jest.Mock).mock.calls.find(
      ([event]: [string]) => event === 'window-all-closed'
    )?.[1];

    if (windowAllClosedCallback) {
      windowAllClosedCallback();
      if (process.platform !== 'darwin') {
        expect(app.quit).toHaveBeenCalled();
      } else {
        expect(app.quit).not.toHaveBeenCalled();
      }
    } else {
      throw new Error('windowAllClosedCallback not defined');
    }
  });

  it('should create a new window when the app is activated', () => {
    require('../../src/main');

    const activateCallback = (app.on as jest.Mock).mock.calls.find(
      ([event]: [string]) => event === 'activate'
    )?.[1];

    const getAllWindowsSpy = jest.spyOn(BrowserWindow, 'getAllWindows').mockReturnValue([]);

    if (activateCallback) {
      activateCallback();
      expect(BrowserWindow).toHaveBeenCalled();
      expect(getAllWindowsSpy).toHaveBeenCalled();
    } else {
      throw new Error('activateCallback not defined');
    }
  });
});
