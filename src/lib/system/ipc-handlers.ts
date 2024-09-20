import { dialog, IpcMain, IpcMainInvokeEvent } from 'electron';
import { getDesktopPath } from '@/lib/utils/desktop-path';
import { IpcEvent } from '@/enum/ipc-event';
import { ConversionHandler } from '@/lib/conversion/conversion-handler';
import { VideoFormat } from '@/enum/video-format';
import { AudioFormat } from '@/enum/audio-format';
import { ImageFormat } from '@/enum/image-format';
import { Media } from '@/types/media';

// Create a single instance of ConversionHandler to handle all conversions
const conversionHandler = new ConversionHandler();

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
        mediaType,
      }: {
        id: string;
        filePath: string;
        outputFormat: VideoFormat | AudioFormat | ImageFormat;
        saveDirectory: string;
        mediaType: Media;
      },
    ) => {
      return await conversionHandler.handle(id, filePath, outputFormat, saveDirectory, mediaType, event);
    },
  );

  ipcMain.handle(IpcEvent.CANCEL_CONVERSION, () => {
    return conversionHandler.cancelAll();
  });

  ipcMain.handle(IpcEvent.CANCEL_ITEM_CONVERSION, (_event: IpcMainInvokeEvent, id: string) => {
    return conversionHandler.cancel(id);
  });
}
