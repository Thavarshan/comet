import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  IpcMainInvokeEvent
} from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import * as os from 'os';
import { existsSync } from 'node:fs';
import path from 'node:path';

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

function parseTimemark(timemark: string) {
  const parts = timemark.split(':').reverse();
  let seconds = 0;

  if (parts.length > 0) seconds += parseFloat(parts[0]); // seconds.xxx
  if (parts.length > 1) seconds += parseInt(parts[1]) * 60; // minutes
  if (parts.length > 2) seconds += parseInt(parts[2]) * 3600; // hours

  return seconds;
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: isDev ? 1200 : 700,
    height: 810,
    resizable: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'images', 'icon', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setFullScreenable(false);
  mainWindow.setMenuBarVisibility(false);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  const ffmpegProcesses = new Map<string, ffmpeg.FfmpegCommand>();
  const ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
  const ffprobePath = ffprobe.path.replace('app.asar', 'app.asar.unpacked');

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

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
      const outputFileName = path.basename(filePath, path.extname(filePath))
        + '.'
        + outputFormat;
      const outputPath = path.join(saveDirectory, outputFileName);

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration;

        const ffmpegCommand = ffmpeg(filePath)
          .output(outputPath)
          .on('progress', (progress) => {
            const processedSeconds = parseTimemark(progress.timemark);
            const calculatedProgress = (processedSeconds / duration) * 100;

            event.sender.send('conversion-progress', {
              id,
              progress: calculatedProgress
            });
          })
          .on('end', () => {
            ffmpegProcesses.delete(id);
            resolve(outputPath);
          })
          .on('error', (error: Error) => {
            ffmpegProcesses.delete(id);
            if (error.message.includes('SIGKILL')) {
              reject(new Error('Conversion canceled by user'));
              return;
            }
            reject(error);
          })
          .save(outputPath);

        ffmpegProcesses.set(id, ffmpegCommand);
      });
    });
  });

  ipcMain.handle('cancel-conversion', (event: IpcMainInvokeEvent, id: string) => {
    const process = ffmpegProcesses.get(id);
    if (process) {
      process.kill('SIGKILL'); // Terminate the FFmpeg process
      ffmpegProcesses.delete(id);
      event.sender.send('conversion-canceled', { id }); // Inform the frontend that the conversion was canceled
      return true;
    }
    return false;
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
