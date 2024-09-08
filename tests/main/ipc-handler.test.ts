import { configureIpcHandlers } from '../../src/lib/ipc-handlers';
import { IpcEvent } from '../../src/enum/ipc-event';
import { dialog, ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDesktopPath } from '../../src/lib/desktop-path';
import { handleConversion, handleConversionCancellation } from '../../src/lib/ffmpeg';

jest.mock('../../src/lib/desktop-path');
jest.mock('../../src/lib/ffmpeg');

describe('configureIpcHandlers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    ipcMain.removeAllListeners();
  });

  test('should handle GET_DESKTOP_PATH', async () => {
    const mockGetDesktopPath = jest.mocked(getDesktopPath);
    mockGetDesktopPath.mockReturnValue('/mock/desktop/path');

    configureIpcHandlers(ipcMain);

    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([event]) => event === IpcEvent.GET_DESKTOP_PATH
    )[1];

    const result = await handler();

    expect(result).toBe('/mock/desktop/path');
    expect(mockGetDesktopPath).toHaveBeenCalled();
  });

  test('should handle DIALOG_SELECT_DIRECTORY', async () => {
    const mockShowOpenDialog = jest.mocked(dialog.showOpenDialog);
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/mock/directory'] });

    configureIpcHandlers(ipcMain);

    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([event]) => event === IpcEvent.DIALOG_SELECT_DIRECTORY
    )[1];

    const result = await handler();

    expect(result).toBe('/mock/directory');
    expect(mockShowOpenDialog).toHaveBeenCalledWith({
      properties: ['openDirectory'],
    });
  });

  test('should handle DIALOG_SELECT_DIRECTORY cancellation', async () => {
    const mockShowOpenDialog = jest.mocked(dialog.showOpenDialog);
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    configureIpcHandlers(ipcMain);

    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([event]) => event === IpcEvent.DIALOG_SELECT_DIRECTORY
    )[1];

    const result = await handler();

    expect(result).toBeNull();
    expect(mockShowOpenDialog).toHaveBeenCalledWith({
      properties: ['openDirectory'],
    });
  });

  test('should handle CONVERT_VIDEO', async () => {
    const mockHandleConversion = jest.mocked(handleConversion);
    mockHandleConversion.mockImplementation(
      (_event, _id, _filePath, _outputFormat, _saveDirectory, resolve) => {
        resolve('/mock/output/path');
      }
    );

    configureIpcHandlers(ipcMain);

    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([event]) => event === IpcEvent.CONVERT_VIDEO
    )[1];

    const result = await handler(
      {} as IpcMainInvokeEvent,
      {
        id: '1',
        filePath: '/mock/path/video.mp4',
        outputFormat: 'mp4',
        saveDirectory: '/mock/save',
      }
    );

    expect(result).toBe('/mock/output/path');
    expect(mockHandleConversion).toHaveBeenCalledWith(
      expect.any(Object),
      '1',
      '/mock/path/video.mp4',
      'mp4',
      '/mock/save',
      expect.any(Function),
      expect.any(Function)
    );
  });

  test('should handle CANCEL_CONVERSION', () => {
    const mockHandleConversionCancellation = jest.mocked(handleConversionCancellation);
    mockHandleConversionCancellation.mockReturnValue(true);

    configureIpcHandlers(ipcMain);

    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([event]) => event === IpcEvent.CANCEL_CONVERSION
    )[1];

    const result = handler({} as IpcMainInvokeEvent, '1');

    expect(result).toBe(true);
    expect(mockHandleConversionCancellation).toHaveBeenCalledWith(expect.any(Object), '1');
  });
});
