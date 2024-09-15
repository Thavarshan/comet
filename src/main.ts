import {
  app,
  BrowserWindow,
  ipcMain,
  IpcMainEvent,
  nativeTheme,
  systemPreferences,
} from 'electron';
import {
  shouldQuit,
  isDevMode,
  setupDevTools,
  getOrCreateMainWindow,
  configureIpcHandlers,
  mainIsReady,
} from './lib';
import path from 'node:path';
import { IpcEvent } from './enum/ipc-event';

// Path to the entry HTML file for the main window
const entryFilePath = !process.env.JEST ? '/fake/path' : path.join(
  __dirname,
  `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
);

/**
 * Handle the app's "ready" event. This is essentially
 * the method that takes care of booting the application.
 */
export async function onReady() {
  if (!isDevMode()) {
    process.env.NODE_ENV = 'production';
  }

  setupShowWindow();
  setupDevTools();
  setupTitleBarClickMac();
  setupNativeTheme();
  setupGetSystemTheme();
  setupIsDevMode();

  // Do this after setting everything up to ensure that
  // any IPC listeners are set up before they're used
  mainIsReady();
  await getOrCreateMainWindow(entryFilePath);

  configureIpcHandlers(ipcMain); // Set up IPC handlers
}

/**
 * Set up the IPC handler for showing the window.
 */
export function setupShowWindow() {
  ipcMain.on(IpcEvent.SHOW_WINDOW, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.show();
    }
  });
}

/**
 * On macOS, set up the custom titlebar click handler.
 */
export function setupTitleBarClickMac() {
  if (process.platform !== 'darwin') {
    return;
  }

  ipcMain.on(IpcEvent.CLICK_TITLEBAR_MAC, (event: IpcMainEvent) => {
    const doubleClickAction = systemPreferences.getUserDefault(
      'AppleActionOnDoubleClick',
      'string',
    );
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (doubleClickAction === 'Minimize') {
        win.minimize();
      } else if (doubleClickAction === 'Maximize') {
        if (!win.isMaximized()) {
          win.maximize();
        } else {
          win.unmaximize();
        }
      }
    }
  });
}

/**
 * Check if the value is a valid native theme source.
 *
 * @param val - The value to check
 *
 * @returns Whether the value is a valid native theme source
 */
function isNativeThemeSource(val: unknown): val is typeof nativeTheme.themeSource {
  return typeof val === 'string' && ['dark', 'light', 'system'].includes(val);
}

/**
 * Handle theme changes.
 */
export function setupNativeTheme() {
  ipcMain.on(IpcEvent.SET_NATIVE_THEME, (_event, source: string) => {
    if (isNativeThemeSource(source)) {
      nativeTheme.themeSource = source;
    }
  });

  // Only notify renderer if the theme source is 'system'
  if (nativeTheme) {
    nativeTheme.on('updated', () => {
      const currentTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send(IpcEvent.NATIVE_THEME_UPDATED, currentTheme);
      });
    });
  }
}

/**
 * Handle getting the system theme.
 */
export function setupGetSystemTheme() {
  ipcMain.on(IpcEvent.GET_SYSTEM_THEME, (event) => {
    const currentTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    event.returnValue = currentTheme;
  });
}

/**
 * Handle isDevMode for renderer.
 */
export function setupIsDevMode() {
  ipcMain.on(IpcEvent.IS_DEV_MODE, (event) => {
    event.returnValue = isDevMode();
  });
}

/**
 * All windows have been closed, quit on anything but macOS.
 */
export function onWindowsAllClosed() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
}

/**
 * The main method - and the first function to run
 * when Comet is launched.
 *
 * Exported for testing purposes.
 */
export function main() {
  // Handle creating/removing shortcuts on Windows when
  // installing/uninstalling.
  if (shouldQuit()) {
    app.quit();
    return;
  }

  // Set the app's name
  app.name = 'Comet';

  // Launch
  app.whenReady().then(onReady);
  app.on('window-all-closed', onWindowsAllClosed);
  app.on('activate', () => {
    app.whenReady().then(async () => {
      await getOrCreateMainWindow(entryFilePath); // Create the main window if there are no open windows
    });
  });

}

// Run the main method
main();
