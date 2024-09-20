/**
 * @jest-environment node
 */

import { configureIpcHandlers } from '../../src/lib/system/ipc-handlers';
import { IpcEvent } from '../../src/enum/ipc-event';
import { dialog, ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDesktopPath } from '../../src/lib/utils/desktop-path';
import { ConversionHandler } from '../../src/lib/conversion/conversion-handler';

jest.mock('../../src/lib/utils/desktop-path');
jest.mock('../../src/lib/conversion/conversion-handler');

describe('configureIpcHandlers', () => {
  let mockConversionHandler: jest.Mocked<ConversionHandler>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockConversionHandler = new ConversionHandler() as jest.Mocked<ConversionHandler>;
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

  test('should handle CONVERT_MEDIA', async () => {
    // Make sure the mocked conversion handler returns a resolved promise
    mockConversionHandler.handle.mockResolvedValue('/mock/output/path');

    configureIpcHandlers(ipcMain);

    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([event]) => event === IpcEvent.CONVERT_MEDIA
    )[1];

    const result = await handler(
      {} as IpcMainInvokeEvent,
      {
        id: '1',
        filePath: '/mock/path/video.mp4',
        outputFormat: 'mp4',
        saveDirectory: '/mock/save',
        mediaType: 'video',
      }
    );

    expect(result).toBe('/mock/output/path');
    expect(mockConversionHandler.handle).toHaveBeenCalledWith(
      '1',
      '/mock/path/video.mp4',
      'mp4',
      '/mock/save',
      'video',
      expect.any(Object)
    );
  });

  test('should handle CANCEL_ITEM_CONVERSION', () => {
    // Mock the cancel method to return true
    mockConversionHandler.cancel.mockReturnValue(true);

    configureIpcHandlers(ipcMain);

    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([event]) => event === IpcEvent.CANCEL_ITEM_CONVERSION
    )[1];

    const result = handler({} as IpcMainInvokeEvent, '1');

    expect(result).toBe(true);
    expect(mockConversionHandler.cancel).toHaveBeenCalledWith('1');
  });

  test('should handle CANCEL_CONVERSION', () => {
    // Ensure cancelAll doesn't return undefined but behaves as expected
    mockConversionHandler.cancelAll.mockImplementation(() => true);

    configureIpcHandlers(ipcMain);

    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      ([event]) => event === IpcEvent.CANCEL_CONVERSION
    )[1];

    const result = handler({} as IpcMainInvokeEvent);

    expect(result).toBe(true);
    expect(mockConversionHandler.cancelAll).toHaveBeenCalled();
  });
});
