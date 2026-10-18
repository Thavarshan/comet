import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { validateManifest } from '../src/lib/releases.ts';

/** Keep the static import buildable even after a missing or damaged cache. */
export async function prepareReleaseSnapshot(
  destination = new URL('../src/data/releases.json', import.meta.url),
) {
  try {
    validateManifest(JSON.parse(await readFile(destination, 'utf8')));
  } catch {
    await mkdir(new URL('.', destination), { recursive: true });
    await writeFile(
      destination,
      JSON.stringify(
        {
          schemaVersion: 1,
          verifiedAt: new Date(0).toISOString(),
          refreshFailed: true,
          releases: [],
        },
        null,
        2,
      ) + '\n',
    );
    console.warn(
      'No valid release snapshot; using official GitHub Releases fallback.',
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], 'file:').href
) {
  await prepareReleaseSnapshot();
}
