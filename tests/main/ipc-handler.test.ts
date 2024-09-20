import { dialog, IpcMainInvokeEvent } from 'electron';
import { getDesktopPath } from '@/lib/utils/desktop-path';
import { IpcEvent } from '@/enum/ipc-event';
import { configureIpcHandlers, conversionHandler } from '@/lib/system/ipc-handlers';

// Mock the dependencies
jest.mock('electron', () => ({
  dialog: {
    showOpenDialog: jest.fn(),
  },
}));
jest.mock('@/lib/utils/desktop-path', () => ({
  getDesktopPath: jest.fn(),
}));
jest.mock('@/lib/conversion/conversion-handler');

describe('configureIpcHandlers', () => {
  let ipcMainMock: any;
  let conversionHandlerMock: jest.Mocked<typeof conversionHandler>;

  beforeEach(() => {
    ipcMainMock = {
      handle: jest.fn(),
    };

    jest.clearAllMocks();

    // Mock the exported conversionHandler instance
    conversionHandlerMock = conversionHandler as jest.Mocked<typeof conversionHandler>;
  });

  it('should handle GET_DESKTOP_PATH and call getDesktopPath()', () => {
    configureIpcHandlers(ipcMainMock);

    const mockGetDesktopPath = getDesktopPath as jest.Mock;
    mockGetDesktopPath.mockReturnValue('/path/to/desktop');

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.GET_DESKTOP_PATH)[1];
    handler();

    expect(mockGetDesktopPath).toHaveBeenCalled();
  });

  it('should handle DIALOG_SELECT_DIRECTORY and call dialog.showOpenDialog()', async () => {
    configureIpcHandlers(ipcMainMock);

    const dialogMock = dialog.showOpenDialog as jest.Mock;
    dialogMock.mockResolvedValue({ canceled: false, filePaths: ['/path/to/directory'] });

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.DIALOG_SELECT_DIRECTORY)[1];
    const result = await handler();

    expect(dialogMock).toHaveBeenCalledWith({ properties: ['openDirectory'] });
    expect(result).toBe('/path/to/directory');
  });

  it('should return null if directory selection is canceled', async () => {
    configureIpcHandlers(ipcMainMock);

    const dialogMock = dialog.showOpenDialog as jest.Mock;
    dialogMock.mockResolvedValue({ canceled: true, filePaths: [] });

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.DIALOG_SELECT_DIRECTORY)[1];
    const result = await handler();

    expect(dialogMock).toHaveBeenCalledWith({ properties: ['openDirectory'] });
    expect(result).toBeNull();
  });

  it('should handle CONVERT_MEDIA and call conversionHandler.handle()', async () => {
    configureIpcHandlers(ipcMainMock);

    conversionHandlerMock.handle.mockResolvedValue('conversion-success'); // Mock the result

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.CONVERT_MEDIA)[1];

    const mockEvent = {} as IpcMainInvokeEvent;
    const mediaParams = {
      id: '1',
      filePath: '/path/to/file',
      outputFormat: 'mp4',
      saveDirectory: '/path/to/save',
      mediaType: 'video',
    };

    const result = await handler(mockEvent, mediaParams);

    expect(conversionHandlerMock.handle).toHaveBeenCalledWith(
      '1',
      '/path/to/file',
      'mp4',
      '/path/to/save',
      'video',
      mockEvent
    );
    expect(result).toBe('conversion-success');
  });

  it('should handle CANCEL_CONVERSION and call conversionHandler.cancelAll()', () => {
    configureIpcHandlers(ipcMainMock);

    conversionHandlerMock.cancelAll.mockReturnValue(undefined); // Mock the result

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.CANCEL_CONVERSION)[1];
    const result = handler();

    expect(conversionHandlerMock.cancelAll).toHaveBeenCalled();
    expect(result).toBe(undefined);
  });

  it('should handle CANCEL_ITEM_CONVERSION and call conversionHandler.cancel()', () => {
    configureIpcHandlers(ipcMainMock);

    conversionHandlerMock.cancel.mockReturnValue(undefined as any); // Mock the result

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.CANCEL_ITEM_CONVERSION)[1];
    const result = handler({}, '1');

    expect(conversionHandlerMock.cancel).toHaveBeenCalledWith('1');
    expect(result).toBe(undefined);
  });
});
