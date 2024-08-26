import path from 'node:path';

export const isDev = process.env.NODE_ENV === 'development';

export const browserWindowConfig = {
  width: isDev ? 1200 : 700,
  height: 710,
  resizable: false,
  autoHideMenuBar: true,
  icon: path.join(__dirname, 'assets', 'images', 'icon', 'icon.png'),
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  },
};
