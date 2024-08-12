import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { execSync } from 'child_process';

// Conditionally import ffmpeg-static only in the main process
let ffmpegStatic: string | undefined;

if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  ffmpegStatic = require('ffmpeg-static');
}

export function getFfmpegPath(): string {
  try {
    const ffmpegPath = execSync('which ffmpeg').toString().trim();
    if (fs.existsSync(ffmpegPath)) {
      return ffmpegPath;
    }
  } catch (error) {
    ipcMain.emit('ffmpeg-status', 'System FFmpeg not found, using ffmpeg-static');
  }

  // Fallback to ffmpegStatic
  if (ffmpegStatic) {
    return ffmpegStatic;
  }

  throw new Error('FFmpeg binary not found');
}

// Quit the app if it's started by Electron Squirrel on Windows
if (process.platform === 'win32' && require('electron-squirrel-startup')) {
  app.quit();
}

const ffmpegPath = getFfmpegPath();

if (ffmpegPath) {
  try {
    if (fs.existsSync(ffmpegPath)) {
      fs.chmodSync(ffmpegPath, '755'); // Ensure FFmpeg binary is executable
    }
    ffmpeg.setFfmpegPath(ffmpegPath);
  } catch (err) {
    dialog.showErrorBox('FFmpeg Error', `Failed to set executable permissions or FFmpeg path: ${err.message}`);
    app.quit(); // Quit if FFmpeg path cannot be set
  }
} else {
  dialog.showErrorBox('FFmpeg Error', 'FFmpeg binary not found');
  app.quit(); // Quit if FFmpeg binary is not found
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 700,
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

  const isDev = process.env.NODE_ENV === 'development';
  const mainWindowUrl = isDev
    ? process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL // Ensure this env variable is available
    : `file://${path.join(__dirname, `../renderer/${process.env.MAIN_WINDOW_VITE_NAME}/index.html`)}`;

  mainWindow.loadURL(mainWindowUrl);

  if (isDev) {
    // mainWindow.webContents.openDevTools();
  }
};

app.on('ready', () => {
  createWindow();

  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('getDownloadsPath', () => {
    return path.join(os.homedir(), 'Downloads');
  });

  ipcMain.handle('convert-video', async (_event, { filePath, outputFormat, saveDirectory }) => {
    try {
      const outputFilePath = path.join(saveDirectory, `${path.parse(filePath).name}.${outputFormat}`);

      return await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .toFormat(outputFormat)
          .on('progress', (progress) => {
            if (progress.percent) {
              _event.sender.send('conversion-progress', progress);
            }
          })
          .on('end', () => resolve(outputFilePath))
          .on('error', (error) => {
            _event.sender.send('conversion-error', `FFmpeg error: ${error.message}`);
            reject(error);
          })
          .save(outputFilePath);
      });
    } catch (error) {
      _event.sender.send('conversion-error', `Error during video conversion: ${error.message}`);
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

// Handle uncaught errors globally
process.on('uncaughtException', (error) => {
  dialog.showErrorBox('An Uncaught Exception Occurred', error.message);
});
