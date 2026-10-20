import type {
  PublishedRelease,
  ReleaseAsset,
  ReleaseManifest,
} from '@honeymelon/contracts';

export const releaseRepository =
  'https://github.com/Thavarshan/honeymelon/releases';

const versionPattern =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** Numeric prerelease identifiers cannot have leading zeroes. */
function semanticVersion(value: string): RegExpExecArray | null {
  const parsed = versionPattern.exec(value);
  if (parsed?.[4]?.split('.').some((part) => /^0[0-9]+$/.test(part))) {
    return null;
  }

  return parsed;
}

/** Reject untrusted metadata before it can become a public download link. */
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected release metadata object');
  }

  return value as Record<string, unknown>;
}

/** Keep unknown architectures unknown, including contradictory name tokens. */
export function classifyAsset(
  name: string,
): Pick<ReleaseAsset, 'os' | 'arch' | 'format'> {
  const lower = name.toLowerCase();
  const token = (pattern: string): boolean =>
    new RegExp(`(?:^|[._-])(?:${pattern})(?=$|[._-])`).test(lower);
  const architectures = [
    token('x64|x86_64|amd64') && 'x64',
    token('arm64|aarch64') && 'arm64',
  ].filter(Boolean);
  const format =
    ['tar.gz', 'appimage', 'deb', 'rpm', 'exe', 'zip', 'appx'].find((suffix) =>
      lower.endsWith('.' + suffix),
    ) ?? 'unknown';
  const systems = [
    token('darwin|macos') && 'macos',
    (token('win32|windows') || ['exe', 'appx'].includes(format)) && 'windows',
    (token('linux') || ['deb', 'rpm', 'appimage'].includes(format)) && 'linux',
  ].filter(Boolean);

  return {
    os: systems.length === 1 ? (systems[0] as ReleaseAsset['os']) : null,
    arch:
      architectures.length === 1
        ? (architectures[0] as ReleaseAsset['arch'])
        : null,
    format,
  };
}

/** Compare stable and prerelease versions using semver precedence. */
export function compareVersions(left: string, right: string): number {
  const a = semanticVersion(left);
  const b = semanticVersion(right);
  if (!a || !b) {
    throw new Error('Invalid semantic version');
  }

  for (const index of [1, 2, 3]) {
    const difference = Number(a[index]) - Number(b[index]);
    if (difference) {
      return difference;
    }
  }

  if (!a[4] || !b[4]) {
    if (a[4]) {
      return -1;
    }

    if (b[4]) {
      return 1;
    }

    return 0;
  }

  const ap = a[4].split('.');
  const bp = b[4].split('.');
  for (let index = 0; index < Math.max(ap.length, bp.length); index++) {
    const x = ap[index];
    const y = bp[index];
    if (x === undefined || y === undefined) {
      return x === undefined ? -1 : 1;
    }

    if (x === y) {
      continue;
    }

    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);

    if (xn && yn) {
      return Number(x) - Number(y);
    }

    if (xn) {
      return -1;
    }

    if (yn) {
      return 1;
    }

    return x < y ? -1 : 1;
  }

  return 0;
}

/** Require exact repository, tag and asset paths. */
function assetUrl(tag: string, name: string): string {
  if (
    !name ||
    /[/\\]/.test(name) ||
    [...name].some((character) => character.charCodeAt(0) < 32) ||
    name === '.' ||
    name === '..'
  ) {
    throw new Error('Unsafe asset name');
  }

  return `${releaseRepository}/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`;
}

/** Reduce GitHub responses to deterministic public fields. */
export function normalizeReleases(input: unknown): PublishedRelease[] {
  if (!Array.isArray(input)) {
    throw new Error('Expected releases array');
  }

  const versions = new Set<string>();
  const ids = new Set<number>();
  const releases: PublishedRelease[] = [];
  for (const value of input) {
    const raw = record(value);
    if (raw.draft === true) {
      continue;
    }

    const tag = raw.tag_name;
    if (
      typeof tag !== 'string' ||
      !semanticVersion(tag) ||
      raw.draft !== false ||
      typeof raw.prerelease !== 'boolean'
    ) {
      throw new Error('Invalid release state or version');
    }

    const version = tag.replace(/^v/, '');
    if (versions.has(version.split('+')[0] ?? version)) {
      throw new Error('Duplicate release version');
    }

    versions.add(version.split('+')[0] ?? version);
    if (
      !Number.isSafeInteger(raw.id) ||
      Number(raw.id) <= 0 ||
      ids.has(Number(raw.id))
    ) {
      throw new Error('Invalid release ID');
    }

    ids.add(Number(raw.id));
    const url = `${releaseRepository}/tag/${encodeURIComponent(tag)}`;
    if (
      raw.html_url !== url ||
      typeof raw.published_at !== 'string' ||
      !Number.isFinite(Date.parse(raw.published_at)) ||
      !Array.isArray(raw.assets)
    ) {
      throw new Error('Invalid published release');
    }

    const assets: ReleaseAsset[] = [];
    const assetIds = new Set<number>();
    for (const item of raw.assets) {
      const asset = record(item);
      if (
        asset.state !== 'uploaded' ||
        typeof asset.name !== 'string' ||
        !Number.isSafeInteger(asset.id) ||
        Number(asset.id) <= 0 ||
        !Number.isSafeInteger(asset.size) ||
        Number(asset.size) <= 0 ||
        assetIds.has(Number(asset.id))
      ) {
        throw new Error('Invalid uploaded asset');
      }

      assetIds.add(Number(asset.id));
      const download = assetUrl(tag, asset.name);
      if (asset.browser_download_url !== download) {
        throw new Error('Asset URL does not match repository');
      }

      const platform = classifyAsset(asset.name);
      if (platform.format === 'unknown') {
        continue;
      }

      const digest = asset.digest;
      if (
        digest !== null &&
        digest !== undefined &&
        (typeof digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(digest))
      ) {
        throw new Error('Invalid digest');
      }

      const notes =
        typeof raw.body === 'string' ? raw.body.replace(/\s+/g, ' ') : '';
      const unsignedMac =
        platform.os === 'macos' &&
        /macOS builds are not Developer ID signed or notarized/i.test(notes);
      const unsignedWindows =
        platform.os === 'windows' &&
        /Windows installers are not Authenticode signed/i.test(notes);
      assets.push({
        id: Number(asset.id),
        name: asset.name,
        url: download,
        size: Number(asset.size),
        ...platform,
        signing: unsignedMac || unsignedWindows ? 'unsigned' : 'unknown',
        notarization: unsignedMac ? 'not-notarized' : 'unknown',
        trustSource: unsignedMac || unsignedWindows ? url : null,
        minimumOsVersion: null,
        checksum:
          typeof digest === 'string'
            ? {
                algorithm: 'sha256',
                value: digest.slice(7),
                source: 'github-digest',
              }
            : null,
      });
    }

    releases.push({
      id: Number(raw.id),
      tag,
      version,
      channel:
        raw.prerelease || semanticVersion(tag)?.[4] ? 'prerelease' : 'stable',
      publishedAt: new Date(raw.published_at).toISOString(),
      url,
      notes: typeof raw.body === 'string' ? raw.body : '',
      assets: assets.sort((a, b) => a.name.localeCompare(b.name, 'en')),
    });
  }

  return releases.sort((a, b) => compareVersions(b.version, a.version));
}

/** Revalidate cached data with the same rules as a fresh API response. */
export function validateManifest(input: unknown): ReleaseManifest {
  const manifest = record(input);
  if (
    manifest.schemaVersion !== 1 ||
    typeof manifest.verifiedAt !== 'string' ||
    !Number.isFinite(Date.parse(manifest.verifiedAt)) ||
    typeof manifest.refreshFailed !== 'boolean' ||
    !Array.isArray(manifest.releases)
  ) {
    throw new Error('Invalid release snapshot');
  }

  const reconstructed = manifest.releases.map((item: unknown) => {
    const release = record(item);
    if (!Array.isArray(release.assets)) {
      throw new Error('Invalid cached assets');
    }

    return {
      id: release.id,
      tag_name: release.tag,
      draft: false,
      prerelease: release.channel === 'prerelease',
      html_url: release.url,
      published_at: release.publishedAt,
      body: release.notes,
      assets: release.assets.map((item: unknown) => {
        const asset = record(item);
        const checksum =
          asset.checksum === null ? null : record(asset.checksum);
        if (
          checksum &&
          (checksum.algorithm !== 'sha256' ||
            checksum.source !== 'github-digest')
        ) {
          throw new Error('Invalid checksum provenance');
        }

        return {
          id: asset.id,
          name: asset.name,
          browser_download_url: asset.url,
          size: asset.size,
          state: 'uploaded',
          digest: checksum ? `sha256:${String(checksum.value)}` : null,
        };
      }),
    };
  });
  const releases = normalizeReleases(reconstructed);
  if (JSON.stringify(releases) !== JSON.stringify(manifest.releases)) {
    throw new Error('Cached fields do not match verified classification');
  }

  return {
    schemaVersion: 1,
    verifiedAt: manifest.verifiedAt,
    refreshFailed: manifest.refreshFailed,
    releases,
  };
}

/** OS hints narrow a list; user agents cannot reliably identify CPU type. */
export function detectPlatform(userAgent: string): ReleaseAsset['os'] {
  if (/Android|iPhone|iPad/i.test(userAgent)) {
    return null;
  }

  if (/Windows/i.test(userAgent)) {
    return 'windows';
  }

  if (/Macintosh|Mac OS X|macOS/i.test(userAgent)) {
    return 'macos';
  }

  if (/Linux/i.test(userAgent)) {
    return 'linux';
  }

  return null;
}

/** Failed refreshes never reset the snapshot verification clock. */
export function isReleaseSnapshotStale(
  manifest: ReleaseManifest,
  currentDay: number,
): boolean {
  return (
    manifest.refreshFailed ||
    currentDay - Math.floor(Date.parse(manifest.verifiedAt) / 86400000) > 7
  );
}
