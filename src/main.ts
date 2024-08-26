import {
  app,
  BrowserWindow,
  ipcMain,
} from 'electron';
import {
  createWindow,
  configureIpcHandlers,
} from './lib';
import { browserWindowConfig as config } from './config';
import path from 'node:path';

const entryFilePath = path.join(
  __dirname,
  `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
);

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.whenReady().then(() => {
  createWindow(config, entryFilePath);

  configureIpcHandlers(ipcMain);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(config, entryFilePath);
  }
});
