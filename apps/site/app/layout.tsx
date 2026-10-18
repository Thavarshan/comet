import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { MotionToggle } from '../src/components/motion-toggle';
import './globals.css';

/**
 * Next.js turns this object into ordinary HTML metadata at build time.
 * No server request or user tracking is required to show these values.
 */
export const metadata: Metadata = {
  title: {
    default: 'Comet — Your files, your orbit',
    template: '%s · Comet',
  },
  description:
    'Convert video, audio, and images on your own computer with Comet. ' +
    'Open source, private by design, and free to use.',
  robots: { index: true, follow: true },
  icons: { icon: '/logo.svg' },
};

/** Layout receives a page from the Next.js router as its children. */
interface RootLayoutProps {
  readonly children: ReactNode;
}

/**
 * Shared site chrome: brand, navigation, skip link, and footer.
 *
 * The surrounding layout stays a Server Component. Only the small motion
 * button needs client-side React, so the marketing pages remain statically
 * exportable and do not require a Node.js server.
 */
export default function RootLayout({
  children,
}: RootLayoutProps): ReactElement {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="site-shell">
          <header className="site-header">
            <a className="brand" href="/" aria-label="Comet home">
              <span className="brand__symbol" aria-hidden="true">
                <img src="/logo.svg" alt="" width="32" height="32" />
              </span>
              <span className="brand__wordmark">
                comet<span>.</span>
              </span>
              <span className="brand__edition">THE FILE LAB</span>
            </a>
            <nav className="site-navigation" aria-label="Main navigation">
              <a href="/download/">Download</a>
              <a href="/docs/">
                Docs
              </a>
            </nav>
            <a href="/privacy/">Privacy</a>
            <MotionToggle />
          </header>
          {children}
          <footer className="site-footer">
            <div className="site-footer__identity">
              <strong>comet.</strong>
              <span>MADE FOR YOUR MACHINE, NOT THE CLOUD.</span>
            </div>
            <a href="https://github.com/Thavarshan/comet">
              OPEN SOURCE ON GITHUB <span aria-hidden="true">↗</span>
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
