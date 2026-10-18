import { extractFile } from '@electron/asar';
import path from 'node:path';

/** ASAR's filesystem reader requires the host's native path separators. */
export function readBundledModule(archive, name) {
  return extractFile(
    archive,
    path.join('.vite', 'build', `${name}.cjs`),
  ).toString();
}
