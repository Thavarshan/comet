/** Public release metadata: unknown platform and trust facts stay explicit. */
export interface ReleaseAsset {
  readonly id: number;
  readonly name: string;
  readonly url: string;
  readonly size: number;
  readonly os: 'windows' | 'macos' | 'linux' | null;
  readonly arch: 'x64' | 'arm64' | null;
  readonly format: string;
  readonly signing: 'unsigned' | 'unknown';
  readonly notarization: 'not-notarized' | 'unknown';
  readonly trustSource: string | null;
  readonly minimumOsVersion: null;
  readonly checksum: {
    readonly algorithm: 'sha256';
    readonly value: string;
    readonly source: 'github-digest';
  } | null;
}

/** A published release, independent of GitHub's authenticated API response. */
export interface PublishedRelease {
  readonly id: number;
  readonly tag: string;
  readonly version: string;
  readonly channel: 'stable' | 'prerelease';
  readonly publishedAt: string;
  readonly url: string;
  readonly notes: string;
  readonly assets: readonly ReleaseAsset[];
}

/** Serve checked snapshots without credentials or visitor API fetches. */
export interface ReleaseManifest {
  readonly schemaVersion: 1;
  readonly verifiedAt: string;
  readonly refreshFailed: boolean;
  readonly releases: readonly PublishedRelease[];
}
