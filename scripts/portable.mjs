import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { packagePaths } from './package-paths.mjs';

const { directory, target } = packagePaths();
const { version } = JSON.parse(
  await readFile('apps/desktop/package.json', 'utf8'),
);

// Tar preserves Linux executable modes and symlinks across artifact storage.
if (process.platform === 'linux') {
  const output = path.resolve('apps/desktop/out/make/portable');
  await mkdir(output, { recursive: true });
  execFileSync('tar', [
    '-czf',
    path.join(output, `comet-${version}-${target}.tar.gz`),
    '-C',
    path.dirname(directory),
    path.basename(directory),
  ]);
}
