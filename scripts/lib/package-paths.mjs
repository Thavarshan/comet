import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

export function packagePaths() {
  const target = `${process.platform}-${process.arch}`;
  const directory = path.join(root, 'apps/desktop/out', `Honeymelon-${target}`);
  const relativeExecutable =
    process.platform === 'darwin'
      ? 'Honeymelon.app/Contents/MacOS/Honeymelon'
      : process.platform === 'win32'
        ? 'Honeymelon.exe'
        : 'Honeymelon';
  const resources =
    process.platform === 'darwin'
      ? path.join(directory, 'Honeymelon.app/Contents/Resources')
      : path.join(directory, 'resources');

  return {
    target,
    directory,
    resources,
    executable: path.join(directory, relativeExecutable),
    relativeExecutable,
  };
}
