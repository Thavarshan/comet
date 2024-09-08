import type { BrowserWindowConstructorOptions } from 'electron';
import { Windows } from './enum/windows';
import path from 'node:path';
import { isDevMode } from './lib/devmode';

export const browserWindowOptions = {
  width: isDevMode() ? Windows.DEV_WIDTH : Windows.WIDTH,
  height: Windows.HEIGHT,
  minHeight: Windows.MIN_HEIGHT,
  minWidth: Windows.MIN_WIDTH,
  titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
  titleBarOverlay: process.platform === 'darwin',
  resizable: false,
  autoHideMenuBar: true,
  acceptFirstMouse: true,
  backgroundColor: '#ffffff',
  icon: path.join(process.cwd(), 'assets', 'icons', 'icon.png'),
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  },
} as BrowserWindowConstructorOptions;
