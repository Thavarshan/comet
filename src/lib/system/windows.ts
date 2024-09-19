import { BrowserWindowConstructorOptions, BrowserWindow } from 'electron';
import { browserWindowOptions } from '../../options';
import { isDevMode } from '../utils/devmode';

// Keep a global reference of the window objects, if we don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
export let browserWindows: Array<BrowserWindow | null> = [];

let mainIsReadyResolver: () => void;
const mainIsReadyPromise = new Promise<void>((resolve) => (mainIsReadyResolver = resolve));

/**
 * Resolve the mainIsReadyPromise to indicate that the main window is ready.
 */
export function mainIsReady() {
  mainIsReadyResolver();
}

/**
 * Get the main window options
 */
export function getMainWindowOptions(
  overrides?: Partial<BrowserWindowConstructorOptions>,
): BrowserWindowConstructorOptions {
  return {
    ...browserWindowOptions,
    ...overrides,
  };
}

/**
 * Create a new BrowserWindow instance
 */
export function createWindow(options: BrowserWindowConstructorOptions, entryFilePath: string): BrowserWindow {
  let mainWindow: BrowserWindow | null;
  mainWindow = new BrowserWindow(options);

  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setFullScreenable(false);
  mainWindow.setMenuBarVisibility(false);

  loadEntryPoint(mainWindow, entryFilePath);

  if (isDevMode()) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    browserWindows = browserWindows.filter((w) => mainWindow !== w);

    mainWindow = null;
  });

  browserWindows.push(mainWindow);

  return mainWindow;
}

/**
 * Load the entry point for the main window
 */
function loadEntryPoint(window: BrowserWindow, entryFilePath: string): void {
  if (process.env.JEST) {
    window.loadFile('./fake/path');

    return;
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(entryFilePath);
  }
}

/**
 * Gets or creates the main window, returning it in both cases.
 */
export async function getOrCreateMainWindow(
  entryFilePath: string,
  options: BrowserWindowConstructorOptions = getMainWindowOptions(),
): Promise<Electron.BrowserWindow> {
  await mainIsReadyPromise;
  return (
    BrowserWindow.getFocusedWindow() || browserWindows[0] || createWindow(getMainWindowOptions(options), entryFilePath)
  );
}
