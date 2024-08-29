import { BrowserViewConstructorOptions, BrowserWindow } from 'electron';
import { isDev } from '../config';

/**
 * Create a new BrowserWindow instance
 *
 * @param {BrowserViewConstructorOptions} config
 * @param {string} entryFilePath
 *
 * @returns {BrowserWindow}
 */
export function createWindow(
  config: BrowserViewConstructorOptions,
  entryFilePath: string
): BrowserWindow {
  const mainWindow = new BrowserWindow(config);

  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setFullScreenable(false);
  mainWindow.setMenuBarVisibility(false);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(entryFilePath);
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}
