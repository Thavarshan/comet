import electronUpdater, { type AppUpdater } from 'electron-updater';

/**
 * Get the auto updater instance.
 */
export function getAutoUpdater(): AppUpdater {
  const { autoUpdater } = electronUpdater;
  return autoUpdater;
}

/**
 * Update the Electron app.
 */
export function updateElectronApp(): void {
  const autoUpdater = getAutoUpdater();

  autoUpdater.on('update-available', () => {
    console.log('Update available');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded');
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates();
}
