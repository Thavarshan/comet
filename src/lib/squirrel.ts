/**
 * Check if the app should quit because of Squirrel events.
 */
export function shouldQuit() {
  return require('electron-squirrel-startup');
}
