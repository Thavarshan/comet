import path from 'path';
import { AppConfig } from './interfaces/app-config';

const isDev: boolean = process.env.NODE_ENV === 'development';

export const config = {
  appName: 'Comet',
  productName: 'comet',
  title: 'Comet | Video Converter',
  appId: 'com.github.comet',
  icons: path.join(__dirname, 'assets', 'images', 'icon', 'icon.png'),
  isDev,
  directories: {
    output: 'out',
  },
  width: isDev ? 1200 : 700,
  height: 600,
  resizable: false,
  show: false,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
  }
} as AppConfig;
