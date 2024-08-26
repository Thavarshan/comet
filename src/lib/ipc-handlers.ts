import {
  dialog,
  IpcMain,
  IpcMainInvokeEvent
} from 'electron';
import { getDesktopPath } from './desktop-path';
import {
  handleConversion,
  handleConversionCancellation
} from './ffmpeg';

/**
 * Configure the IPC handlers
 *
 * @param {IpcMain} ipcMain
 *
 * @returns {void}
 */
export function configureIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('get-desktop-path', () => {
    return getDesktopPath();
  });

  ipcMain.handle('dialog:select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('convert-video', async (
    event: IpcMainInvokeEvent,
    { id, filePath, outputFormat, saveDirectory }: {
      id: string,
      filePath: string;
      outputFormat: string;
      saveDirectory: string;
    }
  ) => {
    return new Promise<string>((resolve, reject) => {
      handleConversion(
        event,
        id,
        filePath,
        outputFormat,
        saveDirectory,
        resolve,
        reject
      );
    });
  });

  ipcMain.handle('cancel-conversion', (
    event: IpcMainInvokeEvent,
    id: string
  ) => {
    return handleConversionCancellation(event, id);
  });
}
