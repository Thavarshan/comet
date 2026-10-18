# P2.2 public site acceptance — issue #70

Source delivery: [PR #121](https://github.com/Thavarshan/comet/pull/121),
building on merged #119 and #120. Reviewed on 18 October 2026 UTC.

## Scope and evidence

| Requirement                   | Delivered evidence                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Responsive public content     | Home, features/screenshots, download, getting-started/FAQ, privacy, releases and license pages; shared navigation, source and contributor links.                                                                   |
| Desktop versus Online         | Desktop is the available converter; browser conversion is explicitly unavailable. Formats depend on platform/build; originals are retained until results are checked.                                              |
| SEO                           | Page-specific titles/descriptions/canonicals/social metadata, a 1200 × 630 PNG, static robots/sitemap, English-only routes. No invented deployment origin or translations.                                         |
| Privacy and release claims    | No conversion uploads/accounts/runtime media API. Hosting request logs disclosed. Published stable and beta assets checked against GitHub Releases; legacy stable checksum omissions disclosed.                    |
| Keyboard and motion           | Browser-tested skip link transfers focus to main; navigation and motion controls work; reduced motion and no-JavaScript content checked.                                                                           |
| Accessibility                 | Axe WCAG A/AA scans cover every public route at 390 px and 1280 px, including contrast. Labels and caption colors corrected from actual audit findings. Headings, alt text and intrinsic image dimensions checked. |
| Responsive layout             | No horizontal overflow at 320, 390, 768 and 1280 px. Retained mobile/desktop screenshots inspected, including the feature gallery after native lazy loading.                                                       |
| Performance and static export | Every route exports without SSR; individual new images below 150 kB; all exported JS below 250 kB Brotli. Mobile LCP/layout-shift lab checks pass.                                                                 |
| Monorepo integration          | Shared UI, browser TypeScript preset, typed root lint and Turbo-controlled build/browser tasks; deployment origin is a hashed build input.                                                                         |

## Recorded validation

The hosted quality and CodeQL jobs passed for source commit
`bab16bcb708573fc10c80ee2d5b1c8954a99b1f8` in
[CI run 39153523581](https://github.com/Thavarshan/comet/actions/runs/39153523581).
All 10 Chromium site tests passed, with no skipped or flaky tests. The retained
`browser-contract-diagnostics` artifact includes all-route axe JSON, full-page
screenshots, and mobile lab metrics. Local formatting, typed lint, workspace
typechecks/tests, 14 CI script tests, and both preview/configured-origin exports
also passed.

The 390 px lab run recorded homepage LCP 64 ms and layout shift 0.005882;
features LCP 40 ms and layout shift 0. These are fast localhost lab results, not
field performance claims. New social/screenshot assets total about 116 kB, and
exported JavaScript is about 167 kB with Brotli compression.

The complete required native/security/quality pipeline must pass on the final PR
head before merge; GitHub records that final gate and merge commit.

## Delivery boundary

Issue #70 is the source/content/SEO/accessibility milestone. Production and
preview Cloudflare deployment, actual hostname confirmation, redirects,
response-header checks and rollback are explicitly tracked in dependent #72.
Release inventory and platform/version selection are tracked in #71.

Unconfigured exports deliberately remain noindex previews. A valid configured
HTTPS origin produces the sitemap and canonical/social URLs; this path was
verified with a reserved test origin without claiming a live deployment.
Screen-reader/physical-device testing on the eventual deployment and production
field Core Web Vitals remain publication follow-ups, not completed checks in
this record. Automated audits do not prove full WCAG conformance.
