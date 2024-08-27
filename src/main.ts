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

// Path to the entry HTML file for the main window
const entryFilePath = path.join(
  __dirname,
  `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
);

// Quit the app if it's an Electron Squirrel startup event
if (require('electron-squirrel-startup')) {
  app.quit();
}

/**
 * This function is called when Electron has finished initialization.
 * It creates the main application window and sets up IPC handlers.
 */
app.whenReady().then(() => {
  createWindow(config, entryFilePath); // Create the main window with the specified configuration and entry file

  configureIpcHandlers(ipcMain); // Set up IPC handlers
});

/**
 * This event is emitted when all windows are closed.
 * On non-macOS platforms, it quits the application.
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit(); // Quit the application if the platform is not macOS
  }
});

/**
 * This event is emitted when the application is activated (e.g., when clicked on the dock icon on macOS).
 * It re-creates the main window if there are no open windows.
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(config, entryFilePath); // Re-create the main window
  }
});
