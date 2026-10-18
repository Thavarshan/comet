import { ReleaseCenter } from '../../src/components/release-center';
import { releaseSnapshot } from '../../src/lib/release-snapshot';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { pageMetadata } from '../../src/lib/metadata';

/** Release facts remain on GitHub, where the published artifacts live. */
export const metadata: Metadata = pageMetadata(
  '/releases/',
  'Releases and updates',
  'Find official Comet release notes, stable downloads and beta testing guidance.',
);

/**
 * Avoid a stale release history or implying CI artifacts are releases.
 */
export default function ReleasesPage(): ReactElement {
  return (
    <main id="main-content" className="content-page" tabIndex={-1}>
      <p className="section-kicker">RELEASE LOG / 004</p>
      <h1>Know what you install.</h1>
      <p>
        GitHub Releases is the source of truth for published versions, release
        notes, platform packages and any published checksums. A successful
        development build is not automatically a public release.
      </p>
      <ReleaseCenter manifest={releaseSnapshot()} history />
      <h2>Report a regression</h2>
      <p>
        Include the working and failing versions, operating system, input and
        output formats, and reproduction steps in a GitHub issue. Share a
        non-private sample only when you have permission to publish it.
      </p>
      <p>
        <a href="https://github.com/Thavarshan/comet/issues">
          Report a release problem
        </a>
      </p>
    </main>
  );
}
