import {
  dialog,
  IpcMain,
  IpcMainInvokeEvent
} from 'electron';
import { getDesktopPath } from './desktop-path';
import { IpcEvent } from '../enum/ipc-event';
import {
  handleConversion,
  handleConversionCancellation,
  handleItemConversionCancellation
} from './ffmpeg';

/**
 * Configure the IPC handlers
 *
 * @param {IpcMain} ipcMain
 *
 * @returns {void}
 */
export function configureIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IpcEvent.GET_DESKTOP_PATH, () => {
    return getDesktopPath();
  });

  ipcMain.handle(IpcEvent.DIALOG_SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(IpcEvent.CONVERT_VIDEO, async (
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

  ipcMain.handle(IpcEvent.CANCEL_CONVERSION, (
    event: IpcMainInvokeEvent
  ) => {
    return handleConversionCancellation(event);
  });

  ipcMain.handle(IpcEvent.CANCEL_ITEM_CONVERSION, (
    event: IpcMainInvokeEvent,
    id: string
  ) => {
    return handleItemConversionCancellation(event, id);
  });
}
