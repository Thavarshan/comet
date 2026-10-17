import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export function packagePaths() {
  const target = `${process.platform}-${process.arch}`;
  const directory = path.join(root, 'apps/desktop/out', `Comet-${target}`);
  const relativeExecutable =
    process.platform === 'darwin'
      ? 'Comet.app/Contents/MacOS/Comet'
      : process.platform === 'win32'
        ? 'Comet.exe'
        : 'Comet';
  const resources =
    process.platform === 'darwin'
      ? path.join(directory, 'Comet.app/Contents/Resources')
      : path.join(directory, 'resources');

  return {
    target,
    directory,
    resources,
    executable: path.join(directory, relativeExecutable),
    relativeExecutable,
  };
}
