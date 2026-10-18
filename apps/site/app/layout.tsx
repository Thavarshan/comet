import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Comet — Private media conversion',
    template: '%s | Comet',
  },
  description:
    'Convert images, audio, and video locally with Comet for desktop. ' +
    'No accounts and no media uploads.',
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="site-shell">
          <header className="site-header">
            <a className="brand" href="/" aria-label="Comet home">
              <img src="/logo.svg" alt="" width="34" height="34" />
              <span>Comet</span>
            </a>
            <nav className="site-navigation" aria-label="Main navigation">
              <a href="/download/">Downloads</a>
              <a href="https://github.com/Thavarshan/comet#readme">
                Documentation
              </a>
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            <span>Comet · Local-first media conversion</span>
            <a href="https://github.com/Thavarshan/comet">
              Open source on GitHub
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
