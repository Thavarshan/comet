import { isDevMode } from './devmode';

/**
 * Installs developer tools if we're in dev mode.
 */
export async function setupDevTools(): Promise<void> {
  if (!isDevMode()) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: installExtension, VUEJS3_DEVTOOLS } = require('electron-devtools-installer');

    const vuejs = await installExtension(VUEJS3_DEVTOOLS, {
      loadExtensionOptions: { allowFileAccess: true },
    });
    // eslint-disable-next-line no-console
    console.log(`installDevTools: Installed ${vuejs}`);
  } catch (error) {
    console.warn(`installDevTools: Error occurred:`, error);
  }
}
