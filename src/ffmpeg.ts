import fs from 'fs';
import { execSync } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { App, IpcMain, Dialog } from 'electron';

/**
 * Get the path to the FFmpeg binary.
 *
 * @throws {Error} Will throw an error if the FFmpeg binary is not found.
 */
export function getFfmpegPath(ipcMain: IpcMain): string {
  let ffmpegStatic: string | undefined;

  try {
    const ffmpegPath = execSync('which ffmpeg').toString().trim();

    if (fs.existsSync(ffmpegPath)) {
      return ffmpegPath;
    }
  } catch (error) {
    ipcMain.emit('ffmpeg-status', 'System FFmpeg not found, using ffmpeg-static');
  }

  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    ffmpegStatic = require('ffmpeg-static');
  }

  if (ffmpegStatic) {
    return ffmpegStatic;
  }

  throw new Error('FFmpeg binary not found');
}

/**
 * Create a FFmpeg command instance.
 */
export function makeFfmpeg(
  app: App,
  ipcMain: IpcMain,
  dialog: Dialog
): (filePath: string) => ffmpeg.FfmpegCommand {
  const ffmpegPath = getFfmpegPath(ipcMain);

  if (ffmpegPath) {
    try {
      fs.chmodSync(ffmpegPath, 0o755);
      ffmpeg.setFfmpegPath(ffmpegPath);
    } catch (err) {
      dialog.showErrorBox('FFmpeg Error', `Failed to set executable permissions or FFmpeg path: ${err.message}`);
      app.quit();
    }
  } else {
    dialog.showErrorBox('FFmpeg Error', 'FFmpeg binary not found');
    app.quit();
  }

  return (filePath: string) => ffmpeg(filePath);
}
