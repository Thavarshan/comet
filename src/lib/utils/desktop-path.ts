import { existsSync } from 'fs';
import os from 'os';
import path from 'node:path';

/**
 * Get the path to the desktop directory
 */
export function getDesktopPath(): string {
  const homeDir = path.resolve(os.homedir());
  const desktopDir = path.resolve(os.homedir(), 'Desktop');

  return existsSync(desktopDir) ? desktopDir : homeDir;
}
