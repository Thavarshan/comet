import {
  BrowserWindow,
  globalShortcut,
} from 'electron';
import path from 'path';
import { config } from '../config';
import { ShortCut } from '../enums/shortcut';
import { Event } from '../enums/event';

/**
 * The main application window.
 */
let mainWindow: BrowserWindow | undefined = undefined;

/**
 * Create the main application window.
 */
export function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({ ...config });

  mainWindow.once(Event.READY_TO_SHOW, () => mainWindow.show());

  const mainWindowUrl: string = config.isDev
    ? process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || 'default_dev_url'
    : `file://${path.join(__dirname, '../renderer', process.env.MAIN_WINDOW_VITE_NAME || 'default_name', 'index.html')}`;

  mainWindow.loadURL(mainWindowUrl);

  if (config.isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (!config.isDev) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalShortcut.register(ShortCut.RELOAD, () => { });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalShortcut.register(ShortCut.RELOAD_F5, () => { });
  }

  return mainWindow;
}

export {
  mainWindow,
};
