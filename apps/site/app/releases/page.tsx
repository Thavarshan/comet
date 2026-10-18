import { Button } from '@comet/ui/components/button';
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
        notes, platform packages and checksums. A successful development build
        is not automatically a public release.
      </p>
      <h2>Stable releases</h2>
      <p>
        Start with the latest stable release for everyday use. Read its notes
        and check which operating systems and architectures it supports before
        downloading. Availability varies by version.
      </p>
      <Button asChild size="lg" className="comet-cta comet-cta--dark">
        <a href="https://github.com/Thavarshan/comet/releases/latest">
          View the latest stable release
        </a>
      </Button>
      <h2>Beta releases</h2>
      <p>
        Beta versions are intended for testing. The 3.0.0-beta.1 macOS builds
        are not notarized and its Windows builds are unsigned. Verify the
        published SHA256SUMS and keep your original media.
      </p>
      <p>
        <a href="https://github.com/Thavarshan/comet/releases">
          Browse all official release notes
        </a>
        {' · '}
        <a href="/docs/#verify-download">Learn how to verify a download</a>
      </p>
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
