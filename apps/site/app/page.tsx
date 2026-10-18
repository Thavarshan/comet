export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <span className="eyebrow">Desktop converter · Open source</span>
        <h1 id="hero-title">
          Your files.
          <br />
          Your device.
          <br />
          <span className="highlight">Your choice.</span>
        </h1>
        <p className="lede">
          Convert videos, audio, and images with Comet. Files are processed
          locally on your computer—not uploaded to our servers.
        </p>
        <div className="actions">
          <a className="action primary" href="/download/">
            Get Comet for desktop
            <span aria-hidden="true"> ↗</span>
          </a>
          <a
            className="action secondary"
            href="https://github.com/Thavarshan/comet"
          >
            Explore the source
          </a>
        </div>
      </section>
      <section className="feature-grid" aria-label="Product highlights">
        <article className="feature">
          <span aria-hidden="true" className="feature-icon">01</span>
          <h2>Private by design</h2>
          <p>Desktop conversion happens on your computer, without an account.</p>
        </article>
        <article className="feature">
          <span aria-hidden="true" className="feature-icon">02</span>
          <h2>Three media types</h2>
          <p>Work with images, audio, and video in one focused application.</p>
        </article>
        <article className="feature">
          <span aria-hidden="true" className="feature-icon">03</span>
          <h2>Open source</h2>
          <p>Explore the code, report issues, and help shape the roadmap.</p>
        </article>
      </section>
      <p className="roadmap-note">
        Browser conversion is being developed. It is not available yet.
      </p>
    </main>
  );
}
