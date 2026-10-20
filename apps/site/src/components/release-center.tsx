'use client';

import { NativeSelect } from '@honeymelon/ui/components/native-select';
import { Badge } from '@honeymelon/ui/components/badge';
import { Button } from '@honeymelon/ui/components/button';
import type { ReleaseAsset, ReleaseManifest } from '@honeymelon/contracts';
import { useSyncExternalStore, useState, type ReactElement } from 'react';
import {
  detectPlatform,
  releaseRepository,
  isReleaseSnapshotStale,
} from '../lib/releases';

interface ReleaseCenterProps {
  readonly manifest: ReleaseManifest;
  readonly history?: boolean;
}

/** Share channel selection while keeping downloads entirely user initiated. */
export function ReleaseCenter({
  manifest,
  history = false,
}: ReleaseCenterProps): ReactElement {
  const [channel, setChannel] = useState('stable');
  const [version, setVersion] = useState('');
  const [chosenOs, setOs] = useState<string | null>(null);
  const detected = useSyncExternalStore(
    subscribeBrowser,
    browserPlatform,
    unknownPlatform,
  );
  const currentDay = useSyncExternalStore(
    subscribeBrowser,
    browserDay,
    serverDay,
  );
  const os = chosenOs ?? detected;
  const [chosenArch, setArch] = useState('');
  const [format, setFormat] = useState('');
  const hint = detected
    ? 'Your browser suggests an operating system. Confirm it and choose your processor; no architecture was assumed.'
    : 'Choose your operating system and processor.';
  const releases = manifest.releases.filter(
    (release) => release.channel === channel,
  );
  const release =
    releases.find((entry) => entry.version === version) ?? releases[0];
  const architectures = [
    ...new Set(
      release?.assets
        .filter((asset) => asset.os === os && asset.arch !== null)
        .map((asset) => asset.arch) ?? [],
    ),
  ].sort();
  const arch = architectures.find((item) => item === chosenArch) ?? '';
  const formats = [
    ...new Set(
      release?.assets
        .filter((asset) => asset.os === os && asset.arch === arch)
        .map((asset) => asset.format) ?? [],
    ),
  ].sort();
  const compatible =
    release?.assets.filter(
      (asset) =>
        asset.os === os &&
        asset.arch === arch &&
        asset.os !== null &&
        asset.arch !== null,
    ) ?? [];
  const assets = compatible.filter((asset) => asset.format === format);
  const asset = assets.length === 1 ? assets[0] : undefined;
  const stale = isReleaseSnapshotStale(manifest, currentDay);

  let fallbackMessage =
    'Confirm your system, processor and package to reveal a direct download.';
  if (os && architectures.length === 0) {
    fallbackMessage =
      'No verified processor-specific package is available for this system. Check all assets below or the original release.';
  } else if (os && arch && format) {
    fallbackMessage =
      'No unique compatible asset is available for this selection.';
  }

  return (
    <section
      className="release-center"
      aria-label={history ? 'Release history' : 'Choose a download'}
    >
      <p className="release-legacy-note">
        Honeymelon continues the Comet project. Published releases below may
        retain the former application name and filenames. A rebranded build is
        not available until it appears in the verified release list.
      </p>
      <div className="release-center__status">
        <Badge variant="outline">
          {history ? 'PUBLISHED RELEASES' : 'DIRECT FROM GITHUB'}
        </Badge>
        <p>
          Snapshot checked{' '}
          {manifest.releases.length
            ? new Date(manifest.verifiedAt).toISOString().slice(0, 10)
            : 'not yet available'}
          .{' '}
          {stale
            ? 'This snapshot may be out of date. Check GitHub for newer releases.'
            : 'Availability can change after verification.'}
        </p>
        <a href={releaseRepository}>Browse all official releases</a>
      </div>
      <div className="release-controls">
        <div className="release-control">
          <label htmlFor="release-channel">Release channel</label>
          <NativeSelect
            id="release-channel"
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value);
              setVersion('');
              setFormat('');
            }}
          >
            <option value="stable">Stable</option>
            <option value="prerelease">Prerelease / testing</option>
          </NativeSelect>
        </div>
        {!history && (
          <>
            <div className="release-control">
              <label htmlFor="release-version">Version</label>
              <NativeSelect
                id="release-version"
                value={release?.version ?? ''}
                onChange={(event) => {
                  setVersion(event.target.value);
                  setFormat('');
                }}
              >
                {releases.length === 0 && (
                  <option value="">No published version</option>
                )}
                {releases.map((entry) => (
                  <option key={entry.id} value={entry.version}>
                    {entry.tag}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="release-control">
              <label htmlFor="release-os">Operating system</label>
              <NativeSelect
                id="release-os"
                value={os}
                onChange={(event) => {
                  setOs(event.target.value);
                  setArch('');
                  setFormat('');
                }}
              >
                <option value="">Choose a system</option>
                <option
                  value="windows"
                  disabled={
                    !release?.assets.some((asset) => asset.os === 'windows')
                  }
                >
                  Windows
                </option>
                <option
                  value="macos"
                  disabled={
                    !release?.assets.some((asset) => asset.os === 'macos')
                  }
                >
                  macOS
                </option>
                <option
                  value="linux"
                  disabled={
                    !release?.assets.some((asset) => asset.os === 'linux')
                  }
                >
                  Linux
                </option>
              </NativeSelect>
            </div>
            <div className="release-control">
              <label htmlFor="release-arch">Processor architecture</label>
              <NativeSelect
                id="release-arch"
                value={arch}
                onChange={(event) => {
                  setArch(event.target.value);
                  setFormat('');
                }}
              >
                <option value="">Choose a processor</option>
                {architectures.map((architecture) => (
                  <option key={architecture} value={architecture ?? ''}>
                    {architectureLabel(architecture, os)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="release-control">
              <label htmlFor="release-format">Package format</label>
              <NativeSelect
                id="release-format"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option value="">Choose a package</option>
                {formats.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </>
        )}
      </div>
      {!history && (
        <p className="release-hint">
          {hint} Linux users must choose the package format for their
          distribution.
        </p>
      )}
      <div aria-live="polite" aria-atomic="true">
        {!history && release && (
          <article className="release-selection">
            <p className="section-kicker">
              {release.channel === 'stable' ? 'EVERYDAY BUILD' : 'EARLY ACCESS'}{' '}
              / {release.tag}
            </p>
            <h2>{asset ? 'Your matching package.' : 'Find your exact fit.'}</h2>
            {asset ? (
              <>
                <p className="release-filename">{asset.name}</p>
                <p>
                  {(asset.size / 1048576).toFixed(1)} MiB · {asset.os} ·{' '}
                  {asset.arch} · {asset.format}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="honeymelon-cta honeymelon-cta--dark"
                >
                  <a href={asset.url}>
                    Download {release.tag} for {asset.os} ({asset.arch},{' '}
                    {asset.format}) <span aria-hidden="true">↓</span>
                  </a>
                </Button>
                <Checksum asset={asset} />
                <p>
                  Signing: {asset.signing}.{' '}
                  {asset.os === 'macos' && (
                    <>Notarization: {asset.notarization}. </>
                  )}
                  Minimum OS version: unknown.{' '}
                  {asset.trustSource && (
                    <a href={asset.trustSource}>Published trust warning</a>
                  )}
                </p>
              </>
            ) : (
              <p>
                {fallbackMessage}{' '}
                <a href={release.url}>Check this release on GitHub</a>.
              </p>
            )}
            <p>
              Signing, notarization and minimum OS requirements are unknown
              unless the original release notes explicitly state them. Read the
              notes before installing.
            </p>
            {release.channel === 'prerelease' && (
              <p>
                <strong>Testing build.</strong> Prereleases may be unsigned or
                not notarized. Check the published trust warning and keep your
                original files.
              </p>
            )}
            <p>
              <a href={release.url}>
                Original notes and all assets for {release.tag}
              </a>{' '}
              ·{' '}
              <a href="/docs/#verify-download">
                SHA256SUMS and verification instructions
              </a>
            </p>
          </article>
        )}
        {releases.length === 0 && (
          <p>
            No published {channel} releases are in this snapshot.{' '}
            <a href={releaseRepository}>Check official GitHub Releases</a>.
          </p>
        )}
      </div>
      {history &&
        releases.map((entry) => (
          <article key={entry.id} className="release-history-entry">
            <Badge variant="secondary">{entry.channel}</Badge>
            <h2>{entry.tag}</h2>
            <p>
              <time dateTime={entry.publishedAt}>
                {entry.publishedAt.slice(0, 10)}
              </time>{' '}
              · {entry.assets.length} download packages
            </p>
            <p>
              <a href={entry.url}>
                Original GitHub release and assets for {entry.tag}
              </a>
            </p>
            <details>
              <summary>Read release notes for {entry.tag}</summary>
              <pre className="release-notes">
                {entry.notes || 'No release notes were published.'}
              </pre>
            </details>
          </article>
        ))}
      <noscript>
        <p>
          JavaScript enhances the selectors. Every checked release and download
          is listed below.
        </p>
      </noscript>
      {!history && (
        <details className="release-all-assets">
          <summary>All checked versions and packages</summary>
          {manifest.releases.map((entry) => (
            <section key={entry.id}>
              <h2>
                {entry.tag} ({entry.channel})
              </h2>
              <p>
                <a href={entry.url}>Original release notes</a>
              </p>
              <ul>
                {entry.assets.map((item) => (
                  <li key={item.id}>
                    <a href={item.url}>{item.name}</a> —{' '}
                    {(item.size / 1048576).toFixed(1)} MiB;{' '}
                    {item.os ?? 'OS unknown'};{' '}
                    {item.arch ?? 'architecture unknown'}; {item.format}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </details>
      )}
    </section>
  );
}

/** Digests verify integrity, never publisher identity or notarization. */
function Checksum({ asset }: { readonly asset: ReleaseAsset }): ReactElement {
  return asset.checksum ? (
    <p className="release-checksum">
      SHA-256 (published GitHub digest): <code>{asset.checksum.value}</code>.
      Compare this with your local file; a checksum does not establish signing
      or notarization.
    </p>
  ) : (
    <p>
      No verified SHA-256 digest is available in this snapshot. Check the
      original release for a published checksum before installing.
    </p>
  );
}

/** Browser hints are an external store, with an identical SSR fallback. */
function subscribeBrowser(listener: () => void): () => void {
  window.addEventListener('pageshow', listener);
  const timer = window.setInterval(listener, 60000);

  return () => {
    window.removeEventListener('pageshow', listener);
    window.clearInterval(timer);
  };
}

function browserPlatform(): string {
  const hints = navigator as Navigator & {
    readonly userAgentData?: { readonly platform: string };
  };

  return (
    detectPlatform(hints.userAgentData?.platform ?? navigator.userAgent) ?? ''
  );
}

function unknownPlatform(): string {
  return '';
}

function browserDay(): number {
  return Math.floor(Date.now() / 86400000);
}

function serverDay(): number {
  return 0;
}

/** CPU names should describe the chosen system, not a different platform. */
function architectureLabel(
  architecture: ReleaseAsset['arch'],
  os: string,
): string {
  if (architecture === 'x64') {
    return os === 'macos' ? 'Intel (x64)' : 'x64 (Intel / AMD)';
  }

  if (architecture === 'arm64') {
    return os === 'macos' ? 'Apple Silicon (ARM64)' : 'ARM64';
  }

  return 'Unknown architecture';
}
