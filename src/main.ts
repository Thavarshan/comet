import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';

function removeQuarantineAttribute(ffmpegPath: string) {
  try {
    const isQuarantined = execSync(`xattr -p com.apple.quarantine "${ffmpegPath}"`).toString().trim();
    if (isQuarantined) {
      execSync(`sudo xattr -rd com.apple.quarantine "${ffmpegPath}"`);
      return 'Removed quarantine attribute from FFmpeg binary.';
    }
  } catch (error) {
    if (error.message.includes('No such xattr')) {
      return 'FFmpeg binary is not quarantined.';
    } else {
      throw new Error(`Error removing quarantine attribute: ${error.message}`);
    }
  }

  return 'FFmpeg binary is not quarantined.';
}

function getFFmpegPath() {
  const platform = os.platform();
  let ffmpegPath = '';

  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, 'bin')
    : path.join(__dirname, '..', '..', 'bin');

  if (platform === 'darwin') {
    ffmpegPath = path.join(basePath, 'ffmpeg', 'mac', 'ffmpeg');
  } else if (platform === 'win32') {
    ffmpegPath = path.join(basePath, 'ffmpeg', 'win', 'ffmpeg.exe');
  } else if (platform === 'linux') {
    ffmpegPath = path.join(basePath, 'ffmpeg', 'linux', 'ffmpeg');
  }

  return ffmpegPath;
}

const ffmpegPath = getFFmpegPath();

// Ensure ffmpeg binary has execute permissions (Unix-like systems)
try {
  if (fs.existsSync(ffmpegPath)) {
    if (os.platform() === 'darwin') {
      const quarantineMessage = removeQuarantineAttribute(ffmpegPath);
      // Send a message back to the renderer process
      ipcMain.emit('quarantine-status', null, quarantineMessage);
    }
    fs.chmodSync(ffmpegPath, '755');
    ipcMain.emit('ffmpeg-status', null, 'FFmpeg binary is ready.');
  } else {
    throw new Error('FFmpeg binary not found at: ' + ffmpegPath);
  }
} catch (err) {
  // Send error back to renderer process
  ipcMain.emit('ffmpeg-status', null, `Error: ${err.message}`);
}

ffmpeg.setFfmpegPath(ffmpegPath);

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

  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('getDownloadsPath', async () => {
    return path.join(os.homedir(), 'Downloads');
  });

  ipcMain.handle('convert-video', async (_event, { filePath, outputFormat, saveDirectory }) => {
    try {
      const outputFilePath = path.join(saveDirectory, `${path.parse(filePath).name}.${outputFormat}`);

      return await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .setFfmpegPath(ffmpegPath)
          .toFormat(outputFormat)
          .on('end', () => resolve(outputFilePath))
          .on('error', reject)
          .save(outputFilePath);
      });
    } catch (error) {
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
