import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

const ffmpegProcess = spawn(ffmpegStatic, ['-version'], {
  env: process.env,  // Use the current environment
});

ffmpegProcess.stdout.on('data', (data) => {
  console.log(`ffmpeg output: ${data}`);
});

ffmpegProcess.on('error', (error) => {
  console.error(`ffmpeg error: ${error}`);
});

fs.chmodSync(ffmpegStatic, '755');
ffmpeg.setFfmpegPath(ffmpegStatic);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(
    MAIN_WINDOW_VITE_DEV_SERVER_URL || path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
  );

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();

  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    if (result.canceled) {
      return null;
    } else {
      return result.filePaths[0];
    }
  });

  ipcMain.handle('getDownloadsPath', async () => {
    return path.join(os.homedir(), 'Downloads');
  });

  ipcMain.handle('convert-video', async (_event, { filePath, outputFormat, saveDirectory }) => {
    return new Promise((resolve, reject) => {
      const outputFilePath = path.join(saveDirectory, `${path.parse(filePath).name}.${outputFormat}`);

      ffmpeg(filePath)
        .setFfmpegPath(ffmpegStatic) // Set ffmpeg path
        .toFormat(outputFormat)
        .on('end', () => resolve(outputFilePath))
        .on('error', reject)
        .save(outputFilePath);
    });
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
