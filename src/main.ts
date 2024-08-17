import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  IpcMainInvokeEvent,
} from 'electron';
import path from 'path';
import { makeFfmpeg } from './lib/ffmpeg';
import { createWindow } from './lib/window-manager';
import { handleConversion } from './lib/conversion-handler';
import os from 'os';
import { Event } from './enums/event';
import { Channel } from './enums/channel';
import { Platform } from './enums/platform';

app.setName('Comet');

if (
  process.platform === Platform.WINDOWS
  && require('electron-squirrel-startup')
) {
  app.quit();
}

/**
 * Create a FFmpeg command instance.
 */
const ffmpeg = makeFfmpeg(app, ipcMain, dialog);

app.on(Event.READY, () => {
  createWindow();

  ipcMain.handle(Channel.DIALOG_SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(Channel.GET_DOWNLOADS_PATH, () => {
    return path.join(os.homedir(), 'Downloads');
  });

  ipcMain.handle(Channel.CONVERT_VIDEO, async (
    event: IpcMainInvokeEvent,
    { filePath, outputFormat, saveDirectory }
  ) => {
    try {
      const outputFilePath = path.join(
        saveDirectory,
        `${path.parse(filePath).name}.${outputFormat}`
      );

      return await handleConversion(
        ffmpeg,
        event,
        filePath,
        outputFilePath,
        outputFormat
      );
    } catch (error) {
      event.sender.send(
        Channel.CONVERSION_ERROR,
        `Error during video conversion: ${error.message}`
      );

      throw new Error(`Error during video conversion: ${error.message}`);
    }
  });
});

app.on(Event.WINDOW_ALL_CLOSED, () => {
  if (process.platform !== Platform.MAC) {
    app.quit();
  }
});

app.on(Event.ACTIVATE, () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

process.on(Event.UNCAUGHT_EXCEPTION, (error) => {
  dialog.showErrorBox('An Uncaught Exception Occurred', error.message);
});
