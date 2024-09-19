import { dialog, IpcMain, IpcMainInvokeEvent } from 'electron';
import { getDesktopPath } from '../utils/desktop-path';
import { IpcEvent } from '../../enum/ipc-event';
import { handleConversion, handleConversionCancellation, handleItemConversionCancellation } from '../conversion/ffmpeg';
import { VideoFormat } from '../../enum/video-format';
import { AudioFormat } from '../../enum/audio-format';

/**
 * Configure the IPC handlers
 */
export function configureIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IpcEvent.GET_DESKTOP_PATH, () => getDesktopPath());

  ipcMain.handle(IpcEvent.DIALOG_SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(
    IpcEvent.CONVERT_MEDIA,
    async (
      event: IpcMainInvokeEvent,
      {
        id,
        filePath,
        outputFormat,
        saveDirectory,
      }: {
        id: string;
        filePath: string;
        outputFormat: VideoFormat | AudioFormat;
        saveDirectory: string;
      },
    ) => {
      return new Promise<string>((resolve, reject) => {
        handleConversion(event, id, filePath, outputFormat, saveDirectory, resolve, reject);
      });
    },
  );

  ipcMain.handle(IpcEvent.CANCEL_CONVERSION, (event: IpcMainInvokeEvent) => {
    return handleConversionCancellation(event);
  });

  ipcMain.handle(IpcEvent.CANCEL_ITEM_CONVERSION, (event: IpcMainInvokeEvent, id: string) => {
    return handleItemConversionCancellation(event, id);
  });
}
