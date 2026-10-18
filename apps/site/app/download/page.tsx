import { ReleaseCenter } from '../../src/components/release-center';
import { releaseSnapshot } from '../../src/lib/release-snapshot';
import { Badge } from '@comet/ui/components/badge';
import type { Metadata } from 'next';
import { pageMetadata } from '../../src/lib/metadata';
import type { ReactElement } from 'react';

/** Static page metadata is generated at build time. */
export const metadata: Metadata = pageMetadata(
  '/download/',
  'Download',
  'Choose a published Comet desktop release and verify its checksum on GitHub.',
);

/** Choose only exact published assets from the validated build snapshot. */
export default function DownloadPage(): ReactElement {
  return (
    <main id="main-content" className="download-main" tabIndex={-1}>
      <section className="download-hero" aria-labelledby="download-heading">
        <Badge variant="outline" className="download-badge">
          RELEASE STATION / DESKTOP
        </Badge>
        <span className="download-hero__mark" aria-hidden="true">
          ↓
        </span>
        <p className="section-kicker">YOUR NEXT FORMAT STARTS HERE</p>
        <h1 id="download-heading">
          Good things
          <br />
          <em>come down.</em>
        </h1>
        <p>
          Download Comet from its official GitHub Releases page. Pick the
          package for your machine, check the release notes, and keep control of
          your files.
        </p>
      </section>

      <ReleaseCenter manifest={releaseSnapshot()} />

      {/* SHA256SUMS instructions remain available beside each download. */}
      <aside className="download-note" aria-label="Important download notes">
        <strong>ONE SMALL NOTE.</strong>
        <p>
          There is no live browser converter yet. These links download the
          desktop application. Confirm your platform before downloading.
        </p>
        <a href="https://github.com/Thavarshan/comet/issues/61">
          See the development roadmap <span aria-hidden="true">↗</span>
        </a>
      </aside>
    </main>
  );
}
