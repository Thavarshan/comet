import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  IpcMainInvokeEvent
} from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import * as os from 'os';
import { existsSync } from 'node:fs';
import path from 'node:path';
import fs from 'node:fs';

const isDev = process.env.NODE_ENV === 'development';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

function getDesktopPath() {
  const homeDir = path.resolve(os.homedir());
  const desktopDir = path.resolve(os.homedir(), 'Desktop');
  return existsSync(desktopDir) ? desktopDir : homeDir;
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: isDev ? 1200 : 700,
    height: 600,
    resizable: false,
    icon: path.join(__dirname, 'assets', 'images', 'icon', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  const ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
  ffmpeg.setFfmpegPath(ffmpegPath);

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
    { filePath, outputFormat, saveDirectory }: {
      filePath: string;
      outputFormat: string;
      saveDirectory: string;
    }
  ) => {
    return new Promise<string>((resolve, reject) => {
      const outputFileName = path.basename(filePath, path.extname(filePath)) + '.' + outputFormat;
      const outputPath = path.join(saveDirectory, outputFileName);

      ffmpeg(filePath)
        .output(outputPath)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (error: Error) => {
          reject(error);
        })
        .save(outputPath);
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
