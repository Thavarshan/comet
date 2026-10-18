# Comet marketing operations

This directory contains the source-of-truth materials for a **$0 paid-media**
organic discovery and contributor-growth campaign. It does not change the
product name, GitHub repository identity, release processes, or customer data.

- [Campaign tracker / goals](https://github.com/Thavarshan/comet/issues/110)
- [KPI scorecard](SCORECARD.md)
- [Six-week editorial calendar](EDITORIAL_CALENDAR.md)
- [Approved-for-review copy drafts](COPY_BANK.md)

## What we are marketing

**Current:** Comet is a free, open-source desktop app that converts video,
audio and images locally with bundled media tools. Files do not need to be
uploaded to a Comet-hosted service and the desktop app requires no account.

**Stable vs beta:** The project README identifies v2.2.3 as stable and
v3.0.0-beta.1 as an unsigned beta. Confirm release status before publication.
Current v3 screenshots depict the **beta**, not the stable build. Explain
platform trust warnings and point to official checksums where applicable.

**Not yet released:** browser-based conversion, a unified monorepo marketing
site, full browser/desktop format parity, and a Honeymelon rename. Don't write
as though these are live or committed.

## Audiences and honest value proposition

1. People needing a simple local video/audio/image converter: approachable UI,
   multiple-file intake, no media uploads to the service.
2. Privacy-conscious people: conversions happen locally; no Comet account.
3. Engineers: a nontrivial, testable TypeScript/React/Electron/FFmpeg codebase,
   plus opportunities in test coverage, accessibility, docs and localization.

**Working hook:** Your media. Your computer. Your control.

Avoid claiming universal format/codec coverage, benchmark superiority or
stronger security guarantees than have been tested.

## First 90 days
- Oct 19–Nov 1: baseline, community trust/onboarding, brand go/no-go, assets
- Nov 2–15: constructive feedback and appropriately targeted soft launch
- Nov 16–Dec 13: major release launch **only if product and brand gates pass**
- Dec 14–Jan 17: helpful tutorials, issue feedback and contributor retention

## Distribution policy

Value before links. Do not automate repeated Reddit/Discord/forum posts, send
unsolicited bulk DMs, solicit artificial stars/reviews, or cross-post identical
messages. Research current venue-specific rules before submitting. Discuss
limitations openly and participate where community questions are relevant.

Drafts in this directory are **not published announcements**. Check the actual
current release, URL, supported platform and brand decision immediately before
shipping. Existing engineering work in #61, #69–#72, #85 and rebrand #86–#96
takes precedence over premature marketing timelines.

## GitHub repository discovery audit (2026-10-18)

GitHub's public repository About/Topics snapshot included legacy Vue/Vue3
keywords and an apparent Tailwind typo despite the current React-based beta.
Proposed description: "Free, open-source desktop media converter for video,
audio and images. Convert locally with no uploads or account."

Suggested topics to verify against GitHub rules and actually shipped features:
`media-converter`, `video-converter`, `audio-converter`,
`image-converter`, `electron`, `react`, `typescript`, `ffmpeg`,
`open-source`, `cross-platform`.

The issue template's support link calls this a "library" and says issues are
bug-only while feature templates exist. Security documentation also references
a different product and stale support versions. These need careful correction:
see [M1](https://github.com/Thavarshan/comet/issues/112), not silent removal.

## Weekly operating procedure

1. Re-check GitHub and published release truth; note data timestamp.
2. Update the scorecard with *measured* deltas, and mark unavailable metrics.
3. Review developer feedback, first PRs, media bugs, beta status and website.
4. Publish only verified, venue-appropriate content.
5. Select the next three actions by useful feedback and attributable adoption.
6. Record decisions and link resulting issues/PRs.
