import { Button } from '@comet/ui/components/button';
import type { ReactElement } from 'react';
import type { Metadata } from 'next';

/** A missing URL must not inherit the homepage canonical or be indexed. */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

/** A friendly static 404, without a client router or tracking script. */
export default function NotFoundPage(): ReactElement {
  return (
    <main id="main-content" className="not-found" tabIndex={-1}>
      <span className="not-found__number" aria-hidden="true">
        404
      </span>
      <p className="section-kicker">SIGNAL LOST / NO FILE FOUND</p>
      <h1>Wrong orbit.</h1>
      <p>That page is not here, but the way home is just below.</p>
      <Button asChild size="lg" className="comet-cta comet-cta--dark">
        <a href="/">
          Back to Comet <span aria-hidden="true">↗</span>
        </a>
      </Button>
    </main>
  );
}
