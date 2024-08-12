import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';

vi.mock('electron', () => {
  const appOnSpy = vi.fn();
  const createWindowSpy = vi.fn(() => ({
    loadURL: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
  }));

  return {
    app: {
      on: appOnSpy,
      quit: vi.fn(),
    },
    BrowserWindow: createWindowSpy,
    ipcMain: {
      handle: vi.fn(),
    },
    dialog: {
      showOpenDialog: vi.fn(),
    },
    BrowserWindow: createWindowSpy,
  };
});

vi.mock('fluent-ffmpeg', () => ({
  default: vi.fn(() => ({
    setFfmpegPath: vi.fn().mockReturnThis(),
    toFormat: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function (this: any, event, callback) {
      if (event === 'end') callback();
      return this;
    }),
    save: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('ffmpeg-static', () => 'mocked/ffmpeg');

describe('Main Process', () => {
  let appOnSpy: any;
  let createWindowSpy: any;
  let loadURLSpy: any;
  let ffmpegMock: any;

  beforeEach(async () => {
    // Reset and mock environment variables
    (global as any).MAIN_WINDOW_VITE_NAME = 'main_window';
    (global as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:3000';

    // Set up spies
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'chmodSync').mockImplementation(() => { });
    vi.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
    vi.spyOn(os, 'homedir').mockReturnValue('/home/testuser');

    const electron = await import('electron');
    appOnSpy = electron.app.on;
    createWindowSpy = electron.BrowserWindow;
    loadURLSpy = createWindowSpy().loadURL;
    ffmpegMock = await import('fluent-ffmpeg');

    // Dynamically import main.ts after mocks are set up
    await import('../src/main.ts');

    // Trigger the 'ready' event
    const readyCall = appOnSpy.mock.calls.find(call => call[0] === 'ready');
    if (readyCall) {
      const readyCallback = readyCall[1];
      readyCallback();
    } else {
      throw new Error('The ready event was not registered.');
    }
  });

  afterEach(() => {
    // Clean up global variables
    delete (global as any).MAIN_WINDOW_VITE_NAME;
    delete (global as any).MAIN_WINDOW_VITE_DEV_SERVER_URL;
    vi.restoreAllMocks();
  });

  it('should ensure ffmpeg binary has execute permissions', () => {
    expect(fs.chmodSync).toHaveBeenCalledWith('mocked/ffmpeg', '755');
  });

  it('should create a BrowserWindow with the correct properties', () => {
    expect(createWindowSpy).toHaveBeenCalledWith({
      width: 800,
      height: 600,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    expect(loadURLSpy).toHaveBeenCalledWith(expect.stringContaining('/index.html'));
  });

  it('should handle the "dialog:selectDirectory" IPC call', async () => {
    const mockDialogResult = { canceled: false, filePaths: ['/selected/path'] };
    (dialog.showOpenDialog as vi.Mock).mockResolvedValue(mockDialogResult);

    const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'dialog:selectDirectory')[1];
    const result = await handler();

    expect(result).toBe('/selected/path');
  });

  it('should handle the "getDownloadsPath" IPC call', async () => {
    const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'getDownloadsPath')[1];
    const result = await handler();

    expect(result).toBe('/home/testuser/Downloads');
  });

  it('should handle the "convert-video" IPC call', async () => {
    const mockEvent = {};
    const filePath = '/input/file.mp4';
    const outputFormat = 'avi';
    const saveDirectory = '/output';

    const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'convert-video')[1];
    const result = await handler(mockEvent, { filePath, outputFormat, saveDirectory });

    expect(result).toBe('/output/file.avi');
    expect(ffmpegMock.default).toHaveBeenCalledWith(filePath);
    expect(ffmpegMock.default().setFfmpegPath).toHaveBeenCalledWith('mocked/ffmpeg');
    expect(ffmpegMock.default().toFormat).toHaveBeenCalledWith(outputFormat);
  });

  it('should quit the app when all windows are closed (non-macOS)', () => {
    const windowAllClosedHandler = appOnSpy.mock.calls.find(call => call[0] === 'window-all-closed')[1];
    const appQuitSpy = vi.spyOn(app, 'quit').mockImplementation(vi.fn());

    windowAllClosedHandler();

    if (process.platform !== 'darwin') {
      expect(appQuitSpy).toHaveBeenCalled();
    } else {
      expect(appQuitSpy).not.toHaveBeenCalled();
    }
  });

  it('should create a window when activating the app', () => {
    const getAllWindowsSpy = vi.spyOn(BrowserWindow, 'getAllWindows').mockReturnValue([]);

    const activateHandler = appOnSpy.mock.calls.find(call => call[0] === 'activate')[1];

    activateHandler();

    expect(getAllWindowsSpy).toHaveBeenCalled();
    expect(createWindowSpy).toHaveBeenCalled();
  });

  it('should not create a window if one already exists when activating the app', () => {
    const getAllWindowsSpy = vi.spyOn(BrowserWindow, 'getAllWindows').mockReturnValue([{}]);

    const activateHandler = appOnSpy.mock.calls.find(call => call[0] === 'activate')[1];

    activateHandler();

    expect(getAllWindowsSpy).toHaveBeenCalled();
    expect(createWindowSpy).not.toHaveBeenCalled();
  });
});
