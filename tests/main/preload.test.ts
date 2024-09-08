import { setupGlobals } from '../../src/preload';
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IpcEvent } from '../../src/enum/ipc-event';

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  webUtils: {
    getPathForFile: jest.fn(),
  },
}));

describe('setupGlobals', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should expose electron API in main world', async () => {
    await setupGlobals();

    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith('electron', {
      arch: process.arch,
      selectDirectory: expect.any(Function),
      getDesktopPath: expect.any(Function),
      getFilePath: expect.any(Function),
      cancelConversion: expect.any(Function),
      convertVideo: expect.any(Function),
      on: expect.any(Function),
      removeAllListeners: expect.any(Function),
    });
  });

  it('should invoke DIALOG_SELECT_DIRECTORY event', async () => {
    await setupGlobals();
    const electron = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][1];

    await electron.selectDirectory();

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(IpcEvent.DIALOG_SELECT_DIRECTORY);
  });

  it('should invoke GET_DESKTOP_PATH event', async () => {
    await setupGlobals();
    const electron = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][1];

    await electron.getDesktopPath();

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(IpcEvent.GET_DESKTOP_PATH);
  });

  it('should return getPathForFile from webUtils', async () => {
    await setupGlobals();
    const electron = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][1];

    const result = electron.getFilePath();

    expect(result).toBe(webUtils.getPathForFile);
  });

  it('should invoke CANCEL_CONVERSION event with id', async () => {
    await setupGlobals();
    const electron = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][1];

    await electron.cancelConversion(1);

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(IpcEvent.CANCEL_CONVERSION, 1);
  });

  it('should invoke CONVERT_VIDEO event with correct arguments', async () => {
    await setupGlobals();
    const electron = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][1];

    await electron.convertVideo('1', '/mock/path/video.mp4', 'mp4', '/mock/save');

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(IpcEvent.CONVERT_VIDEO, {
      id: '1',
      filePath: '/mock/path/video.mp4',
      outputFormat: 'mp4',
      saveDirectory: '/mock/save',
    });
  });

  it('should add an event listener for a channel', () => {
    setupGlobals();
    const electron = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][1];
    const callback = jest.fn();

    electron.on('channel', callback);

    expect(ipcRenderer.on).toHaveBeenCalledWith('channel', callback);
  });

  it('should remove all listeners for a channel', () => {
    setupGlobals();
    const electron = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][1];

    electron.removeAllListeners('channel');

    expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith('channel');
  });
});
