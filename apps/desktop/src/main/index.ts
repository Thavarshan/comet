import {
  app,
  shell,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
  session,
  systemPreferences,
} from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { z } from 'zod';
import squirrelStartup from 'electron-squirrel-startup';
import {
  batchSchema,
  channels,
  idSchema,
  mediaTypes,
  fileSchema,
  type Capabilities,
} from '@honeymelon/contracts';
import { ConversionEngine, detectCapabilities } from '@honeymelon/engine';
import { migrateProfile } from './migrate-profile.js';
import { PreferenceStore } from './preferences.js';
import { reply, trustedSender } from './ipc.js';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
const developmentUrl =
  typeof MAIN_WINDOW_VITE_DEV_SERVER_URL === 'string'
    ? MAIN_WINDOW_VITE_DEV_SERVER_URL
    : undefined;
// Vite emits CommonJS; __dirname is supplied by Electron for the packaged
// entry.
const buildDirectory = __dirname;
app.name = 'Honeymelon';
app.setPath(
  'userData',
  process.env.HONEYMELON_TEST_USER_DATA ??
    path.join(app.getPath('appData'), 'Honeymelon'),
);

let mainWindow: BrowserWindow | null = null;
let engine: ConversionEngine;
let preferences: PreferenceStore;
let capabilities: Capabilities;
let quitting = false;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  }
});

/**
 * Match native caption buttons and startup paint to the shared Neutral surfaces.
 */
function windowChromeColors() {
  return nativeTheme.shouldUseDarkColors
    ? { color: '#0a0a0a', symbolColor: '#fafafa' }
    : { color: '#ffffff', symbolColor: '#171717' };
}

/**
 * Create the isolated renderer and restrict navigation to its trusted document.
 * Reuse the existing window when the application is activated again.
 */
function createWindow() {
  if (mainWindow) {
    mainWindow.show();

    return;
  }

  mainWindow = new BrowserWindow({
    width: 700,
    height: 750,
    minWidth: 700,
    minHeight: 650,
    show: false,
    resizable: true,
    autoHideMenuBar: true,
    title: 'Honeymelon',
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 14, y: 11 } }
      : { titleBarOverlay: { ...windowChromeColors(), height: 36 } }),
    backgroundColor: windowChromeColors().color,
    icon: path.join(process.resourcesPath, 'icon.png'),
    webPreferences: {
      preload: path.join(buildDirectory, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  const current = mainWindow;
  if (developmentUrl) {
    current.webContents.on(
      'console-message',
      (
        details: Electron.Event<Electron.WebContentsConsoleMessageEventParams>,
      ) => {
        if (details.level === 'error') {
          console.error(`[renderer] ${details.message}`);
        }
      },
    );
    current.webContents.on('preload-error', (_event, _filename, error) =>
      console.error('[preload]', error.message),
    );
    current.webContents.on('did-fail-load', (_event, code, description) =>
      console.error('[renderer load]', code, description),
    );
  }

  current.webContents.on('will-navigate', (event, target) => {
    // Vite reloads the document after its first dependency optimization. Permit
    // this trusted reload while preventing navigation to any other document.
    const destination = new URL(target);
    const allowed = developmentUrl
      ? destination.origin === new URL(developmentUrl).origin &&
        destination.pathname === '/'
      : target === current.webContents.getURL();
    if (!allowed) {
      event.preventDefault();
    }
  });
  current.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  current.once('ready-to-show', () => current.show());
  current.on('closed', () => {
    mainWindow = null;
  });
  if (developmentUrl) {
    void current.loadURL(developmentUrl);
  } else {
    void current.loadFile(
      path.join(buildDirectory, '../renderer/main_window/index.html'),
    );
  }
}

/**
 * Register the named desktop API before loading renderer code.
 * Each command validates the sender and converts failures to typed replies.
 */
function registerHandlers() {
  function handle(
    channel: string,
    operation: (payload: unknown) => unknown | Promise<unknown>,
  ) {
    ipcMain.handle(channel, (event, payload: unknown) =>
      reply(() => {
        if (
          !mainWindow ||
          !trustedSender(event, mainWindow.webContents.id, developmentUrl)
        ) {
          throw new Error('Untrusted IPC sender');
        }

        return operation(payload);
      }),
    );
  }

  handle(channels.environment, () => ({
    platform: process.platform,
    version: app.getVersion(),
    systemTheme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    capabilities,
  }));
  handle(channels.preferences, () => preferences.get());
  handle(channels.savePreferences, async (payload) => {
    const saved = await preferences.save(
      payload as Parameters<PreferenceStore['save']>[0],
    );
    nativeTheme.themeSource = saved.theme;

    return saved;
  });
  handle(channels.importLegacy, async (payload) => {
    const saved = await preferences.importLegacy(payload);
    nativeTheme.themeSource = saved.theme;

    return saved;
  });
  handle(channels.directory, async (payload) => {
    const media = z.enum(mediaTypes).optional().parse(payload) ?? 'video';
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: preferences.get().media[media].directory,
    });

    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
  handle(channels.enqueue, (payload) =>
    engine.enqueueBatch(batchSchema.parse(payload)),
  );
  handle(channels.cancelJob, (payload) =>
    engine.cancelJob(idSchema.parse(payload)),
  );
  handle(channels.cancelBatch, (payload) =>
    engine.cancelBatch(idSchema.parse(payload)),
  );
  handle(channels.snapshot, () => engine.getSnapshot());
  handle(channels.removeItem, (payload) =>
    engine.removeItem(fileSchema.shape.itemId.parse(payload)),
  );
  handle(channels.clearMedia, (payload) =>
    engine.clearMedia(z.enum(mediaTypes).parse(payload)),
  );
  handle(channels.inspect, (payload) =>
    engine.inspectFile(fileSchema.parse(payload)),
  );
  handle(channels.cancelInspection, (payload) =>
    engine.cancelInspection(fileSchema.shape.itemId.parse(payload)),
  );
  handle(channels.reveal, (payload) => {
    const id = idSchema.parse(payload);
    const job = engine.getSnapshot().jobs.find((entry) => entry.id === id);
    if (job?.state !== 'succeeded' || !job.outputPath) {
      throw new Error('No completed output for this job');
    }

    shell.showItemInFolder(job.outputPath);
  });
  handle(channels.show, () => {
    mainWindow?.show();
  });
  handle(channels.titlebar, () => {
    if (process.platform !== 'darwin' || !mainWindow) {
      return;
    }

    const action = systemPreferences.getUserDefault(
      'AppleActionOnDoubleClick',
      'string',
    );
    if (action === 'Minimize') {
      mainWindow.minimize();
    } else if (action === 'Maximize') {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
}

/**
 * Restore preferences, discover native capabilities, and start the desktop.
 * The engine lives in main so renderer reloads never replay submitted work.
 */
async function ready() {
  const home = homedir();
  const desktop = path.join(home, 'Desktop');
  if (!process.env.HONEYMELON_TEST_USER_DATA) {
    await migrateProfile(app.getPath('appData'), app.getPath('userData'));
  }

  preferences = new PreferenceStore(
    path.join(app.getPath('userData'), 'preferences-v1.json'),
    existsSync(desktop) ? desktop : home,
  );
  await preferences.load();
  nativeTheme.themeSource = preferences.get().theme;
  const binaryDirectory = app.isPackaged
    ? path.join(process.resourcesPath, 'bin')
    : path.resolve(
        buildDirectory,
        '../../.cache/bin',
        `${process.platform}-${process.arch}`,
      );
  const extension = process.platform === 'win32' ? '.exe' : '';
  const ffmpegPath = path.join(binaryDirectory, `ffmpeg${extension}`);
  const ffprobePath = path.join(binaryDirectory, `ffprobe${extension}`);
  capabilities = await detectCapabilities(ffmpegPath);
  engine = new ConversionEngine(capabilities, {
    ffmpegPath,
    ffprobePath,
    imageWorkerPath: path.join(buildDirectory, 'image-worker.cjs'),
  });
  engine.subscribe((snapshot) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channels.queueChanged, snapshot);
    }
  });
  nativeTheme.on('updated', () => {
    if (process.platform !== 'darwin' && mainWindow) {
      mainWindow.setTitleBarOverlay(windowChromeColors());
    }

    mainWindow?.webContents.send(
      channels.themeChanged,
      nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    );
  });
  session.defaultSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const connect = developmentUrl
      ? `${new URL(developmentUrl).origin} ws://localhost:* ws://127.0.0.1:*`
      : "'none'";
    const script = developmentUrl ? "'self' 'unsafe-inline'" : "'self'";
    const policy = [
      "default-src 'none'",
      `script-src ${script}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      `connect-src ${connect}`,
      "object-src 'none'",
      "base-uri 'none'",
      "frame-src 'none'",
    ].join('; ');
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    });
  });
  registerHandlers();
  createWindow();
}

// Squirrel lifecycle events must not launch a second application window.
if (squirrelStartup || !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app
    .whenReady()
    .then(ready)
    .catch((error) => {
      dialog.showErrorBox(
        'Honeymelon could not start',
        error instanceof Error ? error.message : String(error),
      );
      app.exit(1);
    });
  app.on('activate', () => {
    if (engine && !quitting) {
      createWindow();
    }
  });
  process.on('SIGTERM', () => app.quit());
  process.on('SIGINT', () => app.quit());
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  app.on('before-quit', (event) => {
    if (!engine || quitting) {
      return;
    }

    event.preventDefault();
    quitting = true;
    void Promise.allSettled([engine.shutdown(), preferences.flush()]).finally(
      () => {
        setImmediate(() => app.quit());
      },
    );
  });
}
