# Comet marketing site (P2.1)

Static Next.js marketing/download shell for
[roadmap #61](https://github.com/Thavarshan/comet/issues/61) and
[issue #69](https://github.com/Thavarshan/comet/issues/69).

## Work locally

Use the repository's pinned Node 24.22.0 and npm 12.2.0.

```sh
npm ci
npm run dev -w @comet/site
npm run typecheck -w @comet/site
npm test -w @comet/site
npm run build -w @comet/site
```

The production output is `apps/site/out/`. The site is fully prerendered, with
no runtime Node server, login, database, paid endpoint or uploaded media.
Cloudflare Workers Static Assets can serve this directory without a Worker
script, as configured in `wrangler.toml`. This ticket does **not** deploy it.

`public/_headers` supplies baseline security headers for Cloudflare. Next.js
uses inline bootstrap scripts in static output, so this initial CSP permits
inline scripts; tightening this policy requires integration testing and belongs
in the content/security follow-up. Locally served files do not automatically
receive Cloudflare's headers.

The application imports design tokens, base styles, and Inter typography from
`@comet/ui`. It has independent routes and a responsive layout. Download links
go to GitHub Releases; platform-specific discovery and verified manifest
generation are tracked in #71. Content, docs, accessibility and SEO expansion
are tracked in #70, and Cloudflare deployment credentials/config in #72. Browser
conversion is **not** claimed to exist.

Next.js `output: 'export'` makes vinext unnecessary for this static application.
Re-evaluate vinext only after a separately approved requirement for SSR, dynamic
routes, or server actions—and a free-tier cost/security assessment.

## Operational checks

- Verify `out/index.html`, `out/download/index.html`, `out/404.html`,
  `out/_headers`, and `out/robots.txt` exist after build.
- Serve `out/` over HTTP to test navigation and mobile viewports.
- Use the existing root `npm run lint`, `npm run typecheck`,
  `npm run build:browser` and CI quality gate before merge.
- Static assets configuration documents `404-page` handling; do not configure
  SPA fallback that accidentally turns missing routes into HTTP 200.
