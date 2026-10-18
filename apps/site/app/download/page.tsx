import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download',
  description: 'Find published Comet desktop releases for your operating system.',
};

export default function DownloadPage() {
  return (
    <main id="main-content" className="inner-page">
      <span className="eyebrow">Downloads</span>
      <h1>Get Comet for desktop</h1>
      <p className="lede">
        Visit GitHub Releases to choose a build for your operating system.
        Comet is free and open source.
      </p>
      <div className="download-grid">
        <section className="download-option">
          <h2>Stable release</h2>
          <p>Recommended for everyday use. Review the release notes and assets.</p>
          <a className="action primary" href="https://github.com/Thavarshan/comet/releases/latest">
            Latest stable on GitHub
          </a>
        </section>
        <section className="download-option">
          <h2>Version 3 beta</h2>
          <p>
            Experimental and unsigned. macOS and Windows may show operating
            system trust warnings. Check SHA256SUMS before installing.
          </p>
          <a className="action secondary" href="https://github.com/Thavarshan/comet/releases/tag/v3.0.0-beta.1">
            Beta release details
          </a>
        </section>
      </div>
      <p className="roadmap-note">
        Automatic release discovery and platform-aware links are planned
        in issue #71.
      </p>
    </main>
  );
}
