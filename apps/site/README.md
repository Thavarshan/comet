# Comet marketing site

A **zero-server, statically generated Next.js site** for the desktop converter.
This is the first milestone of [roadmap #61](https://github.com/Thavarshan/comet/issues/61):
[issue #69](https://github.com/Thavarshan/comet/issues/69).

## If you are new to web development

Imagine a printed brochure. Next.js creates the brochure's pages **once while
building** the project; Cloudflare simply hands those finished pages to
visitors. Unlike a traditional web application, it does not need a continuously
running computer to assemble each page.

- **React** describes what visitors see, using components (small reusable
  pieces of the page).
- **TypeScript** checks that components receive the right kinds of values.
- **CSS** controls typography, layouts, colors, and animations.
- **`@comet/ui`** supplies our shared Button, Badge, Inter font, and tokens.
  The marketing-specific layout is deliberately custom, not another dashboard.
- **GitHub Releases** hosts downloadable desktop applications. The site links
  visitors there; it does not create or distribute installers itself.

## Where things live

| Path | Plain-English purpose |
| --- | --- |
| `app/layout.tsx` | Header, navigation, footer and search metadata |
| `app/page.tsx` | Home-page story and supported media categories |
| `app/download/page.tsx` | Stable/beta links and release warnings |
| `app/not-found.tsx` | The friendly page when a URL does not exist |
| `src/components/orbit-illustration.tsx` | CSS-only orbital illustration |
| `src/components/motion-toggle.tsx` | Pause/resume animation button |
| `app/globals.css` | All site art direction, responsive rules and motion |
| `public/_headers` | Cloudflare HTTP security policy |
| `wrangler.toml` | Static-assets-only hosting setup |
| `scripts/verify-export.mjs` | Tests built HTML, links and security files |

Every component has a docblock explaining **why it exists**, and the less
obvious code paths include inline explanations. Comments should teach intent
and constraints, not restate every obvious line.

## Run the site

Use the repository-pinned Node.js 24.22.0 and npm 12.2.0.

```sh
npm ci
npm run dev -w @comet/site
```

Open the local address printed by Next.js. While developing, React updates
when you save a file.

```sh
npm run typecheck -w @comet/site
npm test -w @comet/site
npm run build -w @comet/site
```

The last command creates **`apps/site/out/`**, containing ordinary HTML and
static assets. The export verifier checks both routes, the 404 page, official
release links, and the Cloudflare security file. Repository-wide CI also runs
lint, formatting, browser package builds and the unchanged native matrix.

## Motion and accessibility

The design is inspired by orbital navigation charts and printed engineering
manuals. It uses parchment, dark ink, warm signal orange and a lime focal
accent; editorial hierarchy and fine rules replace generic shadcn cards.

The orbital diagram is **an illustration**, not a functional web converter.
It has a screen-reader description and its internal decorations are hidden from
assistive technology. Motion is implemented with CSS, not a paid animation
service or heavy JavaScript package.

- Ring rotation suggests conversion in progress.
- Floating source/output labels suggest a format change.
- A breathing core and subtle beacons make the diagram feel alive.
- The opening copy rises into view once and hover feedback is restrained.
- `prefers-reduced-motion` disables movement for users who request it.
- The header provides a separate, keyboard-accessible **Pause motion** control.

Animations never prevent access to text, navigation, or downloads. The page
loads fully without JavaScript, except that the optional pause button then
cannot respond; operating-system motion preferences still work.

## Strict typing and boundaries

The workspace inherits `strict: true`, `noUncheckedIndexedAccess`,
`noImplicitReturns`, and `exactOptionalPropertyTypes` from the monorepo.
Shared content arrays use `satisfies` for shape validation; React components
declare their return and prop types. `app/` and `src/` remain browser-safe,
without Electron, native FFmpeg, runtime Node imports, or uploaded media.

## Security, hosting and honest product claims

`next.config.ts` uses `output: 'export'`; the Wrangler config serves only
static `out/` assets, with explicit 404 behavior. **There is no Worker script,
SSR, database, media API, account, user tracking, or paid backend.** This issue
does not deploy anything or require Cloudflare credentials.

`public/_headers` includes CSP, anti-framing, HSTS and privacy-friendly
feature restrictions. Next.js' static bootstrap currently needs inline script
permission. Tightening that exception should be tested with a deployed preview
rather than silently breaking the site. Local file serving does not apply
Cloudflare response headers.

Desktop v3.0.0-beta.1 remains **unsigned** and is clearly marked; install
warnings and checksum verification are explained. No working web converter is
advertised.

Follow-up milestones remain separate: deeper copy/SEO/accessibility (#70),
verified platform-specific release manifests (#71), and free-tier deployment
(#72). Dynamic rendering with vinext is unnecessary unless SSR is explicitly
approved after a cost/security review.

## Review checklist

1. Visit the home, downloads and 404 pages at 320px, 390px, tablet and desktop.
2. Use keyboard only: skip link, nav, pause button, download links and focus.
3. Test with reduced motion, with motion paused, and with JavaScript disabled.
4. Confirm neither page sends source media, calls an API, or promises web tools.
5. Confirm every linked release exists and beta trust warnings are visible.
6. Run the workspace tests and complete root CI before merging.

Visual and physical-device review still need human sign-off. Passing build and
source tests are **not** a substitute for checking the actual page in browsers.
