# Marketing site publication and verification

The site is a static Next.js export in `apps/site`. It shares the monorepo
TypeScript presets, typed ESLint rules, UI primitives and Turbo pipeline. It has
no media upload API, account service, runtime image optimizer or tracking
script. The planned browser converter is explicitly unavailable in the copy.

## Canonical deployment

Set `COMET_SITE_URL` to the **actual public HTTPS origin** in the deployment's
build environment before publishing an indexable site. An origin has no path,
query, fragment or credentials. Do not use a guessed hostname. This setting is
an explicit Turbo build input so changing deployments invalidates cached SEO
output even though other `COMET_*` settings can pass through the environment.

Without this setting, the export is a preview: pages emit `noindex`, robots.txt
disallows crawling, and the sitemap contains no URLs. With a valid setting, all
seven real public routes receive canonical URLs and matching social metadata,
robots.txt references the sitemap, and the sitemap lists those routes. No locale
or future converter URLs are fabricated. The social image is a 1200 × 630 PNG
exported from the checked-in Comet SVG artwork.

Build from the monorepo root with the pinned Node and npm versions:

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm exec -w @comet/e2e -- playwright install --with-deps chromium
npm run test:site -- --project=site-chromium
```

For production, supply the real origin to the build environment and rerun the
build and browser checks. `apps/site/wrangler.toml` serves only `out/`. Do not
publish `.next/` as the static site. Preview builds and production builds must
not share an origin setting by accident.

## Content and release boundaries

Features includes compressed screenshots from `assets/screenshots`, marked as
desktop development previews. These are actual repository images, not mockups of
unreleased browser functionality. The getting-started page explains SHA-256
verification on each desktop platform and preserves source media guidance.
Release and license pages link the official GitHub release history, repository
license, source and contribution guide. Release inventory, automatic platform
detection and version selection remain owned by issue #71.

## Evidence and budgets

The export verifier requires every route, robots.txt, sitemap.xml and social
asset. It caps each screenshot/social image at 150 kB and all exported
JavaScript at 250 kB with Brotli compression. These are regression budgets, not
a promise about transfer sizes on an unconfigured web server.

Chromium tests audit all public routes at 390 px and 1280 px with axe WCAG
2.0/2.1/2.2 A/AA rules, including contrast. Reports and full-page screenshots
are retained in the `browser-contract-diagnostics` CI artifact on success and
failure. Other tests cover 320/390/768/1280 px overflow, skip-link focus, motion
opt-out, local destinations, titles/descriptions, image dimensions and essential
content without JavaScript.

The mobile lab test records largest-contentful-paint timing and layout shifts
for the home/features pages, enforcing LCP below five seconds and layout shift
at most 0.1. Its JSON attachment is lab evidence from CI, not production field
Core Web Vitals or an INP measurement. A deployed URL and real traffic are
needed for field measurements.

## Delivery and publication gates

Issue #70 delivers the public pages, source, static SEO output and automated
accessibility/performance checks. Its acceptance evidence is recorded in
[the P2.2 acceptance record](../releases/site-p2.2-acceptance.md).

Production hosting is tracked separately in #72. Before publishing an indexed
production site, confirm the actual origin and response headers, test keyboard
and screen-reader behavior on that deployment, and review on physical devices.
Field Core Web Vitals require production traffic and remain post-publication
measurements. These checks are not claimed complete by the source-delivery
record. Automated axe scans do not establish full WCAG conformance.
