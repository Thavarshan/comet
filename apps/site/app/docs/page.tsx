import type { Metadata } from 'next';
import type { ReactElement } from 'react';

/** Search metadata is generated at build time, with no tracking scripts. */
export const metadata: Metadata = {
  title: 'Getting started',
  description: 'Install Comet desktop, verify downloads, and report conversion issues.',
};

/** Beginner-friendly guidance deliberately avoids claiming browser conversion exists. */
export default function GettingStartedPage(): ReactElement {
  return (
    <main id="main-content" className="content-page">
      <p className="section-kicker">FIELD GUIDE / 001</p>
      <h1>Getting started with Comet</h1>
      <p>Comet is a local desktop media converter. The browser converter is planned, not available.</p>
      <h2>1. Choose a release</h2>
      <p>Start with the published stable desktop release. The 3.0 beta is unsigned and may trigger operating-system trust warnings.</p>
      <p><a href="/download/">Compare stable and beta downloads</a></p>
      <h2>2. Verify and install</h2>
      <p>Download only from the official GitHub Releases page. Compare the downloaded file against its published SHA-256 checksum before installing. Do not bypass a warning for a file whose origin or hash you cannot verify.</p>
      <h2>3. Convert a local file</h2>
      <p>Open Comet, select a source file, choose an output supported by your installed version, and select a destination. Available formats and controls vary by platform and encoder. Keep the original until you have checked the result.</p>
      <h2>4. Troubleshoot or contribute</h2>
      <p>When reporting a problem, include your Comet version, operating system, input and output formats, expected result, actual result, and steps to reproduce. Never attach private media to a public issue.</p>
      <p><a href="https://github.com/Thavarshan/comet/issues">Report an issue on GitHub</a> · <a href="https://github.com/Thavarshan/comet/blob/main/CONTRIBUTING.md">Contributor guide</a></p>
      <h2>Frequently asked questions</h2>
      <h3>Do I need an account?</h3>
      <p>No account is required for the desktop conversion workflow.</p>
      <h3>Does Comet upload my files?</h3>
      <p>The desktop conversion workflow processes source media locally rather than uploading it to a Comet conversion server. External websites linked from this site have their own policies.</p>
      <h3>Can I convert files in my browser?</h3>
      <p>Not yet. Browser conversion is a roadmap item, and supported codecs may differ from desktop when it arrives.</p>
    </main>
  );
}
