import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(
  new URL('../../../', import.meta.url),
);

export const desktopDirectory = path.join(repositoryRoot, 'apps/desktop');

export const nativeTarget = `${process.platform}-${process.arch}`;

const binaryDirectory = path.join(desktopDirectory, '.cache/bin', nativeTarget);
const suffix = process.platform === 'win32' ? '.exe' : '';

export const nativePaths = {
  ffmpegPath: path.join(binaryDirectory, `ffmpeg${suffix}`),
  ffprobePath: path.join(binaryDirectory, `ffprobe${suffix}`),
  imageWorkerPath: path.join(
    repositoryRoot,
    'packages/engine/dist/image-worker.js',
  ),
};
