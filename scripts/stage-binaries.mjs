import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdir,
  readFile,
  writeFile,
  chmod,
  rename,
  rm,
  copyFile,
  cp,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { unzipSync } from 'fflate';
import manifest from './binary-manifest.json' with { type: 'json' };
import { fetchBinary, validateDigest } from './binary-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target =
  process.env.COMET_TARGET ?? `${process.platform}-${process.arch}`;
const entry = manifest.targets[target];
if (!entry) {
  throw new Error(`Unsupported binary target: ${target}`);
}

const cache = path.join(root, '.cache/downloads');
const destination = path.join(root, 'apps/desktop/.cache/bin', target);
await mkdir(cache, { recursive: true });
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function download(file) {
  const filename = path.join(cache, validateDigest(file.sha256));
  try {
    const bytes = await readFile(filename);
    if (hash(bytes) === file.sha256) {
      return bytes;
    }
  } catch {
    /* Download a missing or corrupt cache entry. */
  }

  console.log(`Fetching ${new URL(file.url).pathname.split('/').at(-1)}`);
  // Only digest-verified bytes leave the downloader's trust boundary.
  const bytes = await fetchBinary(file);
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, filename);

  return bytes;
}

for (const file of entry.files) {
  const bytes = await download(file);
  if (file.compression === 'zip') {
    const entries = unzipSync(bytes, {
      filter: (item) =>
        file.entries.some(
          (name) => item.name === name || item.name.endsWith('/' + name),
        ),
    });
    for (const name of file.entries) {
      const found = Object.entries(entries).find(
        ([key]) => key === name || key.endsWith('/' + name),
      );
      if (!found) {
        throw new Error(`Missing archive member ${name}`);
      }

      await writeFile(path.join(destination, path.basename(name)), found[1]);
    }
  } else if (file.compression === 'tar.xz') {
    // Extract only named members from a checksum-verified upstream archive.
    for (const name of file.entries) {
      const content = execFileSync(
        'tar',
        ['-xJOf', path.join(cache, file.sha256), `${file.directory}/${name}`],
        { maxBuffer: 256 * 1024 * 1024 },
      );
      await writeFile(path.join(destination, path.basename(name)), content);
    }
  } else {
    await writeFile(
      path.join(destination, file.output),
      file.compression === 'gzip' ? gunzipSync(bytes) : bytes,
    );
  }
}

const suffix = target.startsWith('win32-') ? '.exe' : '';
for (const tool of ['ffmpeg', 'ffprobe']) {
  await chmod(path.join(destination, tool + suffix), 0o755);
}

await copyFile(
  path.join(root, 'scripts/binary-manifest.json'),
  path.join(destination, 'provenance.json'),
);
// Verify every staged byte before packaging, not merely the existence of the
// cache.
const digests = {};
for (const tool of ['ffmpeg', 'ffprobe']) {
  digests[tool + suffix] = hash(
    await readFile(path.join(destination, tool + suffix)),
  );
}

await writeFile(
  path.join(destination, 'staged-sha256.json'),
  JSON.stringify(digests, null, 2),
);
await rm(path.join(destination, 'archive'), { force: true });
console.log(`Verified binary resources: ${target}`);

const packaging = path.join(
  root,
  'apps/desktop/.cache/packaging',
  target,
  'bin',
);
await rm(packaging, { recursive: true, force: true });
await cp(destination, packaging, { recursive: true });
