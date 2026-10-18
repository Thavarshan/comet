import type { Metadata } from 'next';
import type { ReactElement } from 'react';

/**
 * Metadata describes the shipped desktop experience, not the planned web app.
 */
export const metadata: Metadata = {
  title: 'Features and platforms',
  description:
    'Explore local image, audio and video conversion with Comet desktop, plus current limitations.',
};

/**
 * This is a static product comparison rather than an interactive capability
 * selector: codec availability depends on the actual installed desktop build.
 */
export default function FeaturesPage(): ReactElement {
  return (
    <main id="main-content" className="content-page">
      <p className="section-kicker">CAPABILITIES / 003</p>
      <h1>One workflow. Many kinds of media.</h1>
      <p>
        Comet desktop converts files on your own computer. Available encoders,
        formats and advanced settings depend on your platform and installed
        release. Check the output before deleting your original.
      </p>
      <section aria-labelledby="image-heading">
        <h2 id="image-heading">Images</h2>
        <p>
          Work with common image formats, including PNG, JPEG and WebP where
          supported. Format conversion can affect transparency, metadata and
          visual quality.
        </p>
      </section>
      <section aria-labelledby="audio-heading">
        <h2 id="audio-heading">Audio</h2>
        <p>
          Convert audio files or extract an audio track from supported video
          sources. Codec support and output quality settings are not universal.
        </p>
      </section>
      <section aria-labelledby="video-heading">
        <h2 id="video-heading">Video</h2>
        <p>
          Change supported video containers and encoding settings with the
          native desktop engine. Larger workloads can take time and disk space.
        </p>
      </section>
      <section aria-labelledby="platform-heading">
        <h2 id="platform-heading">Desktop or browser?</h2>
        <p>
          Desktop is the available product for local conversion today. Comet Web
          is planned, but there is no live browser converter yet. Browser codec
          coverage and performance may differ from native builds.
        </p>
        <p>
          <a href="/download/">Choose a desktop download</a> ·{' '}
          <a href="/docs/">Read the getting-started guide</a>
        </p>
      </section>
    </main>
  );
}
