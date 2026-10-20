# Brand asset provenance

The Honeymelon melon symbol in `assets/logo.svg` was drawn for this repository
as an original SVG during the October 2026 identity transition. It and the
social preview artwork use this repository's MIT license. No code or artwork was
copied from the separate historical Honeymelon project.

The website logo is a copy of that SVG. `npm run brand:assets` renders the SVG
using the pinned Playwright Chromium dependency and produces PNG, ICO, ICNS and
social preview PNG outputs. Run on macOS to regenerate ICNS with Apple's
`iconutil`. Commit all platform outputs together. The renderer uses the shared
shadcn Neutral tokens; artwork is monochrome.

Product screenshots are captured from the real desktop application with an
isolated profile and generated media fixtures. They contain no user media.
Original author attribution, the MIT license and third-party notices remain in
place. Historic release notes and asset filenames retain their original identity
so downloads and checksum verification continue to work.

## Historical source inventory

The local archive at `/Users/jerome/Projects/apps/honeymelon/` contains a
`website/LICENSE` and `honeymelon/LICENSE` declaring GPLv3. Its desktop `NOTICE`
also documents GPL-3.0-or-later and the author's trademark claim. Those sources,
artwork, fonts and screenshots are **not reused** here. Their notices remain in
the independent archive; this repository is not relicensed.

| Material                                | Decision      | Attribution or obligation                        |
| --------------------------------------- | ------------- | ------------------------------------------------ |
| Historical website and desktop code     | Do not import | GPLv3 archive                                    |
| Historical icons, fonts and screenshots | Replace       | Fresh SVG and real captures                      |
| Current application source              | Retain        | Existing MIT copyright and contributors          |
| Radix/shadcn primitives and Lucide      | Retain        | Existing package licenses                        |
| Inter Variable                          | Retain        | Existing licensed package; no unknown font files |
| FFmpeg and FFprobe                      | Retain        | Pinned build provenance, source URLs and notices |

Native binary staging continues to include the existing upstream notices and
build provenance. Rebranding does not change codec, font or third-party license
obligations. Name approval by the owner does not constitute a legal clearance
search or proof of access to every public domain/account.
