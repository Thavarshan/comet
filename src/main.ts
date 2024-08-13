import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  globalShortcut,
} from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { execSync } from 'child_process';

app.setName('Comet');

let ffmpegStatic: string | undefined;

/**
 * Get the path to the FFmpeg binary.
 *
 * @throws {Error} Will throw an error if the FFmpeg binary is not found.
 */
function getFfmpegPath(): string {
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

if (process.platform === 'win32' && require('electron-squirrel-startup')) {
  app.quit();
}

const ffmpegPath = getFfmpegPath();

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

const isDev = process.env.NODE_ENV === 'development';

/**
 * Create the main application window.
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    title: 'Comet | Video Converter',
    icon: path.join(__dirname, 'assets', 'icon', 'icon.png'),
    width: isDev ? 1200 : 700,
    height: 600,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const mainWindowUrl = isDev
    ? process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL
    : `file://${path.join(__dirname, '../renderer', process.env.MAIN_WINDOW_VITE_NAME, 'index.html')}`;

  mainWindow.loadURL(mainWindowUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (!isDev) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalShortcut.register('CmdOrCtrl+R', () => { });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalShortcut.register('F5', () => { });
  }
}

app.on('ready', () => {
  createWindow();

  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('getDownloadsPath', () => path.join(os.homedir(), 'Downloads'));

  ipcMain.handle('convert-video', async (event, { filePath, outputFormat, saveDirectory }) => {
    try {
      const outputFilePath = path.join(saveDirectory, `${path.parse(filePath).name}.${outputFormat}`);

      return await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .toFormat(outputFormat)
          .on('progress', (progress) => {
            if (progress.percent) {
              event.sender.send('conversion-progress', progress);
            }
          })
          .on('end', () => resolve(outputFilePath))
          .on('error', (error) => {
            event.sender.send('conversion-error', `FFmpeg error: ${error.message}`);
            reject(error);
          })
          .save(outputFilePath);
      });
    } catch (error) {
      event.sender.send('conversion-error', `Error during video conversion: ${error.message}`);
      throw new Error(`Error during video conversion: ${error.message}`);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  dialog.showErrorBox('An Uncaught Exception Occurred', error.message);
});
