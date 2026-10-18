import { Badge } from '@comet/ui/components/badge';
import { Button } from '@comet/ui/components/button';
import type { ReactElement } from 'react';
import { OrbitIllustration } from '../src/components/orbit-illustration';

/**
 * A deliberately small content model keeps the feature list easy to edit.
 *
 * as const asks TypeScript to preserve the exact values. A new developer can
 * add a feature here without copying markup or inventing another component.
 */
const mediaTypes = [
  {
    number: '01',
    title: 'Image',
    detail: 'Resize, refine, and change formats.',
    formats: 'PNG / JPG / WEBP',
  },
  {
    number: '02',
    title: 'Audio',
    detail: 'Convert tracks or extract sound from video.',
    formats: 'MP3 / WAV / FLAC',
  },
  {
    number: '03',
    title: 'Video',
    detail: 'Switch containers, adjust settings, keep originals.',
    formats: 'MP4 / MOV / WEBM',
  },
] as const;

/**
 * A static landing page: all copy and links are available without JavaScript.
 * Buttons and badges use the exact primitives from our shared @comet/ui
 * package. The site's typography and compositions are custom to Comet.
 */
export default function HomePage(): ReactElement {
  return (
    <main id="main-content" className="home-main">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__grain" aria-hidden="true" />
        <div className="hero__copy">
          <Badge variant="outline" className="status-badge">
            <span className="status-badge__dot" aria-hidden="true" />
            OPEN SOURCE / LOCAL FIRST
          </Badge>
          <p className="hero__issue">THE INDEPENDENT MEDIA CONVERTER — EST. 2024</p>
          <h1 id="hero-heading">
            Keep the file.
            <br />
            <em>Change the</em>
            <br />
            format<span className="hero__period">.</span>
          </h1>
          <p className="hero__intro">
            Video, audio, images. Convert them on your own machine, on your
            own terms. No uploads. No accounts. No unnecessary noise.
          </p>
          <div className="hero__actions">
            <Button asChild size="lg" className="comet-cta comet-cta--bright">
              <a href="/download/">
                Download Comet <span aria-hidden="true">↗</span>
              </a>
            </Button>
            <a
              className="text-link text-link--light"
              href="https://github.com/Thavarshan/comet"
            >
              Explore the source <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="hero__footnote">DESKTOP APP · MACOS / WINDOWS / LINUX</p>
        </div>
        <OrbitIllustration />
        <span className="hero__edge-label" aria-hidden="true">
          CONVERSION WITHOUT COMPROMISE — 001
        </span>
      </section>

      <section className="manifesto" aria-labelledby="manifesto-heading">
        <div className="section-marker">
          <span className="section-marker__line" aria-hidden="true" />
          THE IDEA
        </div>
        <div className="manifesto__copy">
          <h2 id="manifesto-heading">
            Your media has a home.
            <br />
            <em>It should stay there.</em>
          </h2>
          <p>
            Comet does the work where your files already live. Your original
            media is not sent to a conversion server, and the desktop
            application does not ask you to create an account.
          </p>
        </div>
        <span className="manifesto__asterisk" aria-hidden="true">✳</span>
      </section>

      <section className="formats" aria-labelledby="formats-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">ONE APP / MANY POSSIBILITIES</p>
            <h2 id="formats-heading">Different files. Same freedom.</h2>
          </div>
          <p>Three ways to make media work for you.</p>
        </div>
        <div className="formats__list">
          {mediaTypes.map((item) => (
            <article className="format-row" key={item.number}>
              <span className="format-row__index">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <span className="format-row__formats">{item.formats}</span>
              <span className="format-row__arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
        <p className="formats__fineprint">
          Available outputs depend on the bundled encoders and your platform.
          Not every input can become every output.
        </p>
      </section>

      <section className="closing" aria-labelledby="closing-heading">
        <p className="section-kicker">THE NEXT CHAPTER</p>
        <h2 id="closing-heading">
          Built for desktop.
          <br />
          <em>Looking to the web.</em>
        </h2>
        <p>
          A browser-based Comet is on the roadmap, but it is not available yet.
          Until then, the desktop app is the place to convert.
        </p>
        <Button asChild size="lg" className="comet-cta comet-cta--dark">
          <a href="/download/">
            Find your download <span aria-hidden="true">↗</span>
          </a>
        </Button>
        <span className="closing__orbit" aria-hidden="true" />
      </section>
    </main>
  );
}
