import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Ensure ffmpeg binary has execute permissions
if (fs.existsSync(ffmpegStatic)) {
  try {
    fs.chmodSync(ffmpegStatic, '755');
  } catch (err) {
    console.error(`Failed to set executable permissions for ffmpeg: ${err.message}`);
  }
} else {
  console.error('FFmpeg binary not found');
}

ffmpeg.setFfmpegPath(ffmpegStatic);

if (process.platform === 'win32' && require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
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
    ? MAIN_WINDOW_VITE_DEV_SERVER_URL
    : `file://${path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)}`;

  mainWindow.loadURL(mainWindowUrl);
};

app.on('ready', () => {
  createWindow();

  // Handle directory selection dialog
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  // Return the Downloads directory path
  ipcMain.handle('getDownloadsPath', async () => {
    return path.join(os.homedir(), 'Downloads');
  });

  // Handle video conversion
  ipcMain.handle('convert-video', async (_event, { filePath, outputFormat, saveDirectory }) => {
    try {
      const outputFilePath = path.join(saveDirectory, `${path.parse(filePath).name}.${outputFormat}`);

      return await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .setFfmpegPath(ffmpegStatic)
          .toFormat(outputFormat)
          .on('end', () => resolve(outputFilePath))
          .on('error', reject)
          .save(outputFilePath);
      });
    } catch (error) {
      console.error('Error during video conversion:', error);
      throw error;
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
