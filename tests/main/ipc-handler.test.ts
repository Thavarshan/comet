import { dialog, IpcMainInvokeEvent } from 'electron';
import { getDesktopPath } from '@/lib/utils/desktop-path';
import { IpcEvent } from '@/enum/ipc-event';
import { ConversionHandler } from '@/lib/conversion/conversion-handler';
import { configureIpcHandlers } from '@/lib/system/ipc-handlers';

// Mock the dependencies
jest.mock('electron', () => ({
  dialog: {
    showOpenDialog: jest.fn(),
  },
}));
jest.mock('@/lib/utils/desktop-path', () => ({
  getDesktopPath: jest.fn(),
}));
jest.mock('@/lib/conversion/conversion-handler', () => {
  return {
    ConversionHandler: jest.fn().mockImplementation(() => ({
      handle: jest.fn(),
      cancelAll: jest.fn(),
      cancel: jest.fn(),
    })),
  };
});

describe('configureIpcHandlers', () => {
  let ipcMainMock: any;
  let conversionHandlerMock: any;

  beforeEach(() => {
    ipcMainMock = {
      handle: jest.fn(),
    };

    jest.clearAllMocks();
    conversionHandlerMock = new ConversionHandler();
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

    const mockHandle = conversionHandlerMock.handle as jest.Mock;
    mockHandle.mockResolvedValue('conversion-success');

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.CONVERT_MEDIA)[1];

    console.log(handler);


    const mockEvent = {} as IpcMainInvokeEvent;
    const mediaParams = {
      id: '1',
      filePath: '/path/to/file',
      outputFormat: 'mp4',
      saveDirectory: '/path/to/save',
      mediaType: 'video',
    };

    const result = await handler(mockEvent, mediaParams);

    expect(mockHandle).toHaveBeenCalledWith(
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

    const mockCancelAll = conversionHandlerMock.cancelAll as jest.Mock;

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.CANCEL_CONVERSION)[1];
    const result = handler();

    expect(mockCancelAll).toHaveBeenCalled();
    expect(result).toBe('cancel-all-success');
  });

  it('should handle CANCEL_ITEM_CONVERSION and call conversionHandler.cancel()', () => {
    configureIpcHandlers(ipcMainMock);

    const mockCancel = conversionHandlerMock.cancel as jest.Mock;

    const handler = ipcMainMock.handle.mock.calls.find((call: any) => call[0] === IpcEvent.CANCEL_ITEM_CONVERSION)[1];
    const result = handler({}, '1');

    expect(mockCancel).toHaveBeenCalledWith('1');
    expect(result).toBe('cancel-item-success');
  });
});
