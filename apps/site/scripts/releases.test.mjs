import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyAsset,
  compareVersions,
  detectPlatform,
  normalizeReleases,
  validateManifest,
} from '../src/lib/releases.ts';

const release = (overrides = {}) => ({
  id: 1,
  tag_name: 'v1.2.3',
  draft: false,
  prerelease: false,
  html_url: 'https://github.com/Thavarshan/comet/releases/tag/v1.2.3',
  published_at: '2026-10-18T10:00:00Z',
  body: 'Published notes',
  assets: [],
  ...overrides,
});
const asset = (name = 'comet-win32-arm64.exe', overrides = {}) => ({
  id: 2,
  name,
  state: 'uploaded',
  size: 100,
  browser_download_url: `https://github.com/Thavarshan/comet/releases/download/v1.2.3/${name}`,
  digest: null,
  ...overrides,
});

test('classifies real platform tokens without guessing unknown architectures', () => {
  for (const [name, os, arch, format] of [
    ['Comet-darwin-arm64-3.0.0-beta.1.zip', 'macos', 'arm64', 'zip'],
    ['Comet-darwin-x64-2.2.3.zip', 'macos', 'x64', 'zip'],
    ['comet-win32-arm64-setup.exe', 'windows', 'arm64', 'exe'],
    ['comet_2.2.3_amd64.deb', 'linux', 'x64', 'deb'],
    ['comet-2.2.3-1.aarch64.rpm', 'linux', 'arm64', 'rpm'],
    ['comet-linux-x64.tar.gz', 'linux', 'x64', 'tar.gz'],
    ['comet-x86_64.AppImage', 'linux', 'x64', 'appimage'],
    ['Comet.appx', 'windows', null, 'appx'],
    ['comet-arm64-x64.exe', 'windows', null, 'exe'],
    ['comet.zip', null, null, 'zip'],
    ['comet-linux-darwin-x64.zip', null, 'x64', 'zip'],
  ]) {
    assert.deepEqual(classifyAsset(name), { os, arch, format });
  }
});

test('stable and prerelease states stay separate; drafts and updater files vanish', () => {
  assert.deepEqual(normalizeReleases([release({ draft: true })]), []);
  const stable = release({
    assets: [asset(), asset('Comet-full.nupkg', { id: 3 })],
  });
  assert.equal(normalizeReleases([stable])[0].assets.length, 1);
  const beta = release({
    id: 4,
    tag_name: 'v2.0.0-beta.1',
    html_url: 'https://github.com/Thavarshan/comet/releases/tag/v2.0.0-beta.1',
  });
  assert.equal(normalizeReleases([beta])[0].channel, 'prerelease');
  assert.equal(
    normalizeReleases([release({ prerelease: true })])[0].channel,
    'prerelease',
  );
  assert.deepEqual(normalizeReleases([]), []);
});

test('sorts deterministically and implements numeric prerelease precedence', () => {
  assert.ok(compareVersions('3.0.0-beta.10', '3.0.0-beta.2') > 0);
  assert.ok(compareVersions('3.0.0', '3.0.0-beta.10') > 0);
  const first = asset('comet-x64.exe');
  const second = asset('comet-arm64.exe', { id: 3 });
  assert.deepEqual(
    normalizeReleases([release({ assets: [first, second] })]),
    normalizeReleases([release({ assets: [second, first] })]),
  );
});

test('rejects duplicate versions, untrusted paths, invalid state and digest', () => {
  assert.throws(
    () => normalizeReleases([release(), release({ id: 3 })]),
    /Duplicate/,
  );
  for (const overrides of [
    { browser_download_url: 'https://evil.example/comet.exe' },
    {
      browser_download_url:
        'https://github.com/Other/comet/releases/download/v1.2.3/comet-win32-arm64.exe',
    },
    { name: '../comet.exe' },
    { state: 'new' },
    { size: -1 },
    { digest: 'sha256:fake' },
  ]) {
    assert.throws(() =>
      normalizeReleases([release({ assets: [asset(undefined, overrides)] })]),
    );
  }
});

test('cache keeps exact checksums and fails closed if derived facts were changed', () => {
  const releases = normalizeReleases([
    release({
      assets: [asset(undefined, { digest: 'sha256:' + 'a'.repeat(64) })],
    }),
  ]);
  const manifest = {
    schemaVersion: 1,
    verifiedAt: '2026-10-18T10:00:00.000Z',
    refreshFailed: true,
    releases,
  };
  assert.deepEqual(validateManifest(manifest), manifest);
  assert.equal(
    validateManifest(manifest).releases[0].assets[0].checksum.source,
    'github-digest',
  );
  const bad = structuredClone(manifest);
  bad.releases[0].assets[0].arch = 'x64';
  assert.throws(() => validateManifest(bad));
  bad.releases[0].channel = 'invalid';
  assert.throws(() => validateManifest(bad));
});

test('browser detection identifies OS only and excludes phones', () => {
  assert.equal(detectPlatform('Windows NT 10.0; Win64; x64'), 'windows');
  assert.equal(detectPlatform('Macintosh; Intel Mac OS X'), 'macos');
  assert.equal(detectPlatform('Linux x86_64'), 'linux');
  assert.equal(detectPlatform('Android Linux'), null);
  assert.equal(detectPlatform('iPad Mac OS X'), null);
  assert.equal(detectPlatform('unknown'), null);
});

test('rate limits and offline failures retain the checked snapshot and timestamp', async () => {
  const { refreshReleases } = await import('./refresh-releases.mjs');
  const cached = {
    schemaVersion: 1,
    verifiedAt: '2026-10-18T10:00:00.000Z',
    refreshFailed: false,
    releases: normalizeReleases([release({ assets: [asset()] })]),
  };
  for (const fetcher of [
    async () => new Response('', { status: 403 }),
    async () => {
      throw new Error('Offline');
    },
  ]) {
    let saved;
    assert.equal(
      await refreshReleases({
        fetcher,
        readPrevious: async () => JSON.stringify(cached),
        persist: async (value) => {
          saved = value;
        },
      }),
      false,
    );
    assert.deepEqual(saved, { ...cached, refreshFailed: true });
  }
});

test('first refresh failure produces an empty safe fallback', async () => {
  const { refreshReleases } = await import('./refresh-releases.mjs');
  let saved;
  await refreshReleases({
    fetcher: async () => new Response('', { status: 429 }),
    readPrevious: async () => {
      throw new Error('Missing');
    },
    persist: async (value) => {
      saved = value;
    },
  });
  assert.deepEqual(saved.releases, []);
  assert.equal(saved.refreshFailed, true);
});

test('fresh snapshot verifies redirects without leaking API tokens to downloads', async () => {
  const { refreshReleases } = await import('./refresh-releases.mjs');
  const calls = [];
  let saved;
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.startsWith('https://api.github.com/')) {
      return Response.json([release({ assets: [asset()] })]);
    }

    assert.equal(options.headers?.Authorization, undefined);
    if (url.startsWith('https://github.com/')) {
      return new Response(null, {
        status: 302,
        headers: {
          location: 'https://release-assets.githubusercontent.com/verified',
        },
      });
    }

    return new Response(null, { status: 200 });
  };

  assert.equal(
    await refreshReleases({
      fetcher,
      token: 'ci-only-secret',
      now: () => '2026-10-18T12:00:00.000Z',
      persist: async (value) => {
        saved = value;
      },
    }),
    true,
  );
  assert.equal(calls.length, 3);
  assert.equal(saved.refreshFailed, false);
  assert.ok(!JSON.stringify(saved).includes('ci-only-secret'));
  assert.deepEqual(validateManifest(saved), saved);
});

test('untrusted download redirects never replace the checked snapshot', async () => {
  const { refreshReleases } = await import('./refresh-releases.mjs');
  let saved;
  let calls = 0;
  const fetcher = async (url) => {
    calls++;
    if (url.startsWith('https://api.github.com/')) {
      return Response.json([release({ assets: [asset()] })]);
    }

    return new Response(null, {
      status: 302,
      headers: { location: 'https://evil.example/binary' },
    });
  };

  assert.equal(
    await refreshReleases({
      fetcher,
      readPrevious: async () => '{}',
      persist: async (value) => {
        saved = value;
      },
    }),
    false,
  );
  assert.equal(calls, 2);
  assert.deepEqual(saved.releases, []);
});

test('trust facts require an explicit published note and retain their source', () => {
  const notes =
    'macOS builds are not Developer ID signed or notarized; Windows installers are not Authenticode signed.';
  const result = normalizeReleases([
    release({
      body: notes,
      assets: [
        asset('Comet-darwin-arm64.zip'),
        asset('comet-win32-arm64.exe', { id: 3 }),
      ],
    }),
  ])[0];
  for (const item of result.assets) {
    assert.equal(item.signing, 'unsigned');
    assert.equal(item.trustSource, result.url);
    assert.equal(item.minimumOsVersion, null);
    assert.equal(
      item.notarization,
      item.os === 'macos' ? 'not-notarized' : 'unknown',
    );
  }

  const unknown = normalizeReleases([
    release({ body: 'A wonderful signed release!', assets: [asset()] }),
  ])[0].assets[0];
  assert.equal(unknown.signing, 'unknown');
  assert.equal(unknown.trustSource, null);
});

test('semver ignores build metadata and rejects numeric prerelease leading zeroes', () => {
  assert.equal(compareVersions('1.2.3+one', '1.2.3+two'), 0);
  assert.throws(() => compareVersions('1.2.3-beta.01', '1.2.3'));
  assert.equal(classifyAsset('comet-x64.tar.gz').os, null);
});

test('missing and corrupt snapshots prepare a buildable empty fallback', async () => {
  const { mkdtemp, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { pathToFileURL } = await import('node:url');
  const { prepareReleaseSnapshot } =
    await import('./prepare-release-snapshot.mjs');
  const directory = await mkdtemp(tmpdir() + '/comet-snapshot-');
  const destination = pathToFileURL(directory + '/releases.json');
  try {
    await prepareReleaseSnapshot(destination);
    assert.deepEqual(
      validateManifest(JSON.parse(await readFile(destination, 'utf8')))
        .releases,
      [],
    );
    await writeFile(destination, '{broken JSON');
    await prepareReleaseSnapshot(destination);
    assert.equal(
      validateManifest(JSON.parse(await readFile(destination, 'utf8')))
        .refreshFailed,
      true,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('stale snapshots warn after seven days or an unsuccessful refresh', async () => {
  const { isReleaseSnapshotStale } = await import('../src/lib/releases.ts');
  const manifest = {
    schemaVersion: 1,
    verifiedAt: '2026-10-01T00:00:00.000Z',
    refreshFailed: false,
    releases: [],
  };
  assert.equal(
    isReleaseSnapshotStale(manifest, Date.parse('2026-10-07') / 86400000),
    false,
  );
  assert.equal(
    isReleaseSnapshotStale(manifest, Date.parse('2026-10-10') / 86400000),
    true,
  );
  assert.equal(
    isReleaseSnapshotStale(
      { ...manifest, refreshFailed: true },
      Date.parse('2026-10-01') / 86400000,
    ),
    true,
  );
  const beta = release({
    id: 4,
    tag_name: 'v2.0.0-beta.1',
    html_url: 'https://github.com/Thavarshan/comet/releases/tag/v2.0.0-beta.1',
  });
  assert.deepEqual(
    normalizeReleases([beta]).filter((item) => item.channel === 'stable'),
    [],
  );
});
