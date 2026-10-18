import { Badge } from '@comet/ui/components/badge';
import { Button } from '@comet/ui/components/button';
import type { Metadata } from 'next';
import { pageMetadata } from '../../src/lib/metadata';
import type { ReactElement } from 'react';

/** These links lead to published GitHub Releases, not draft artifacts. */
interface ReleaseLinks {
  readonly stable: string;
  readonly beta: string;
}

const releases = {
  stable: 'https://github.com/Thavarshan/comet/releases/latest',
  beta: 'https://github.com/Thavarshan/comet/releases/tag/v3.0.0-beta.1',
} as const satisfies ReleaseLinks;

/** Static page metadata is generated at build time. */
export const metadata: Metadata = pageMetadata(
  '/download/',
  'Download',
  'Choose a published Comet desktop release and verify its checksum on GitHub.',
);

/**
 * This first site milestone deliberately does not guess an operating system
 * or scrape the GitHub API at runtime. A later roadmap ticket (#71) generates
 * an independently verified release manifest with per-platform links.
 */
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

      <section className="release-list" aria-label="Available releases">
        <article className="release-entry release-entry--stable">
          <div className="release-entry__rail">
            <span>01 / RECOMMENDED</span>
            <span aria-hidden="true">✳</span>
          </div>
          <div className="release-entry__body">
            <Badge variant="secondary" className="release-entry__badge">
              STABLE
            </Badge>
            <h2>The everyday build.</h2>
            <p>
              Use the latest published stable desktop release for routine
              conversion. GitHub lists the exact builds and release notes. Some
              older stable releases do not publish SHA256SUMS.
            </p>
            <Button asChild size="lg" className="comet-cta comet-cta--dark">
              <a href={releases.stable}>
                Browse stable releases <span aria-hidden="true">↗</span>
              </a>
            </Button>
          </div>
        </article>

        <article className="release-entry release-entry--beta">
          <div className="release-entry__rail">
            <span>02 / EARLY ACCESS</span>
            <span aria-hidden="true">↗</span>
          </div>
          <div className="release-entry__body">
            <Badge variant="outline" className="release-entry__badge">
              UNSIGNED BETA
            </Badge>
            <h2>See what is next.</h2>
            <p>
              Version 3.0.0-beta.1 is for testing. Its macOS builds are not
              notarized and Windows builds are unsigned, so system warnings are
              expected. Verify each download against SHA256SUMS.
            </p>
            <Button asChild size="lg" className="comet-cta comet-cta--outline">
              <a href={releases.beta}>
                Explore the beta <span aria-hidden="true">↗</span>
              </a>
            </Button>
          </div>
        </article>
      </section>

      <aside className="download-note" aria-label="Important download notes">
        <strong>ONE SMALL NOTE.</strong>
        <p>
          There is no live browser converter yet. These links download the
          desktop application; automatic platform detection is planned in #71.
        </p>
        <a href="https://github.com/Thavarshan/comet/issues/61">
          See the development roadmap <span aria-hidden="true">↗</span>
        </a>
      </aside>
    </main>
  );
}
