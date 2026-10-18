export default function NotFoundPage() {
  return (
    <main id="main-content" className="inner-page">
      <span className="eyebrow">404</span>
      <h1>That page is out of orbit.</h1>
      <p className="lede">
        The address may have changed. The Comet homepage is still here.
      </p>
      <a className="action primary" href="/">
        Return home
      </a>
    </main>
  );
}
