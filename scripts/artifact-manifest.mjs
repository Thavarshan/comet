import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/** Hash distributables with portable paths for release verification. */
export async function artifactManifest(directory) {
  const hashes = {};

  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const filename = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(filename);
      } else if (entry.isFile()) {
        const key = path
          .relative(directory, filename)
          .split(path.sep)
          .join('/');
        hashes[key] = createHash('sha256')
          .update(await readFile(filename))
          .digest('hex');
      } else {
        throw new Error('Release artifacts must be regular files');
      }
    }
  }

  await visit(directory);

  return hashes;
}
