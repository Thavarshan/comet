import { readFile, writeFile, rename } from 'node:fs/promises';
import { normalizeReleases, validateManifest } from '../src/lib/releases.ts';

const destination = new URL('../src/data/releases.json', import.meta.url);

/** Follow only GitHub's official binary redirect hosts, without API tokens. */
async function verifyDownload(url, fetcher) {
  for (let redirects = 0; redirects < 5; redirects++) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      ![
        'github.com',
        'release-assets.githubusercontent.com',
        'objects.githubusercontent.com',
      ].includes(parsed.hostname)
    ) {
      throw new Error('Untrusted asset redirect');
    }

    const response = await fetcher(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    });
    if (response.ok) {
      return;
    }

    if (
      [301, 302, 303, 307, 308].includes(response.status) &&
      response.headers.get('location')
    ) {
      url = new URL(response.headers.get('location'), url).href;
      continue;
    }

    throw new Error(`Download verification failed: ${response.status}`);
  }

  throw new Error('Too many download redirects');
}

/** Write atomically so failed refreshes cannot truncate the snapshot. */
async function save(manifest) {
  const temporary = new URL('./releases.json.tmp', destination);
  await writeFile(temporary, JSON.stringify(manifest, null, 2) + '\n');
  await rename(temporary, destination);
}

/** Test the refresh boundary without network or real snapshot mutations. */
export async function refreshReleases({
  fetcher = fetch,
  readPrevious = () => readFile(destination, 'utf8'),
  persist = save,
  now = () => new Date().toISOString(),
  token = process.env.GITHUB_TOKEN,
} = {}) {
  try {
    const raw = [];
    for (let page = 1; page <= 100; page++) {
      const response = await fetcher(
        `https://api.github.com/repos/Thavarshan/comet/releases?per_page=100&page=${page}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!response.ok) {
        throw new Error(`GitHub unavailable: ${response.status}`);
      }

      const releases = await response.json();
      if (!Array.isArray(releases)) {
        throw new Error('Invalid GitHub response');
      }

      raw.push(...releases);
      if (releases.length < 100) {
        break;
      }

      if (page === 100) {
        throw new Error('Release pagination limit reached');
      }
    }

    const releases = normalizeReleases(raw);
    for (const release of releases) {
      for (const asset of release.assets) {
        await verifyDownload(asset.url, fetcher);
      }
    }

    await persist({
      schemaVersion: 1,
      verifiedAt: now(),
      refreshFailed: false,
      releases,
    });
    console.log(`Verified ${releases.length} published releases`);

    return true;
  } catch {
    let previous;
    try {
      previous = validateManifest(JSON.parse(await readPrevious()));
    } catch {
      previous = {
        schemaVersion: 1,
        verifiedAt: new Date(0).toISOString(),
        refreshFailed: true,
        releases: [],
      };
    }

    await persist({ ...previous, refreshFailed: true });
    console.error(
      'Refresh failed; retained checked snapshot or official release fallback.',
    );

    return false;
  }
}

if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], 'file:').href
) {
  if (!(await refreshReleases())) {
    process.exitCode = 1;
  }
}
