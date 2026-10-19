# Comet campaign copy bank — drafts, not published

Prepared 2026-10-18. Final copy requires fresh release, website and naming
checks. Public messages must not accidentally attribute v3 features/UI to the
stable v2.2.3 binary or promote Comet Web as available.

## Short descriptor

**Comet** is a free, open-source desktop media converter for video, audio and
images. Convert files locally without creating an account or uploading them.

## Hero concept (working)

**Your media. Your computer. Your control.**

Convert video, audio and image files locally with a straightforward desktop app
powered by open-source media tooling.

- Primary CTA: **Download stable desktop version**
  https://github.com/Thavarshan/comet/releases/latest
- Secondary CTA: **Explore the source / contribute**
  https://github.com/Thavarshan/comet
- Separate beta CTA: **Try unsigned 3.0 beta**
  https://github.com/Thavarshan/comet/releases/tag/v3.0.0-beta.1

The 3.0 beta currently has operating-system trust warnings because installers
are unsigned. Verify release hashes before trusting downloads. Do not use the
beta screenshots to depict the current stable release.

## Contributor invitation — GitHub/DEV draft

**Want a real open-source TypeScript project to contribute to?**

We're rebuilding Comet, an open-source desktop app for converting video, audio
and images locally. The desktop app uses Electron; our newer beta uses React and
TypeScript, and the codebase includes native conversion execution, shared domain
contracts and platform test coverage.

Useful contributions aren't limited to big features. Documentation, smaller
UI/accessibility fixes, localization, reproducible bug reports and targeted
tests all matter.

If you'd like to explore the code or help, start here:
https://github.com/Thavarshan/comet

We are still validating the 3.0 beta and planning (not shipping) a browser
experience. Feedback about what feels confusing is as useful as a PR.

**Publishing check:** ensure newcomer issues are genuinely small and ready, and
confirm public channel permits project posts.

## Beta testing invitation — draft

**Comet 3.0 beta testers wanted**

Comet is a free, open-source media converter. The next desktop version has a
refreshed React interface and expanded conversion controls, and we'd value
real-world feedback on usability and format compatibility.

This is an **unsigned beta**, not the recommended stable build. macOS and
Windows may display trust warnings. Only download from official GitHub Releases,
review the release notes and verify the published SHA-256 hashes.

Test release: https://github.com/Thavarshan/comet/releases/tag/v3.0.0-beta.1
Report issues: https://github.com/Thavarshan/comet/issues

Please include OS/architecture, source and destination formats, steps to
reproduce, actual vs expected behavior and any relevant logs. Don't upload
private media files to public issue threads.

**Publishing check:** verify the listed beta tag and artifacts are still live,
and that project maintainers can realistically triage incoming reports.

## Developer article opening — draft

### Building Comet: a media converter that works locally

Converting a video should not require uploading it somewhere or learning a long
command-line invocation. That's the problem behind Comet, a small, open-source
desktop application for video, audio and image conversion.

Behind the interface, the project has a less obvious set of engineering
problems: coordinating native work, cancelling running jobs without leaving
unwanted output behind, avoiding file-name collisions, and testing packaged
applications on different operating systems. We're documenting those decisions
as we modernize the Electron app and investigate a future browser edition.

The desktop app is real. The browser edition remains a roadmap item, not a
released online converter.

## Directory listing (only after platform confirmation)

**Title:** Comet — Open-source desktop media converter

**Description:** Free desktop application for converting video, audio and images
locally. No account or media upload required. Browse the source and choose the
stable installer available for your operating system.

**Categories:** Media conversion, video tools, audio tools, image tools,
open-source desktop software.

## Do not claim

- That every source/target format can be converted.
- That Comet 3.0 UI is part of v2.2.3 stable.
- That macOS and Windows binaries are currently trusted/signed.
- That Comet Web has launched or matches native FFmpeg capabilities.
- That local processing prevents all possible security/privacy risks.
- That performance is superior to HandBrake/Shutter Encoder without tests.
- That a Comet → Honeymelon rename has been approved.

Related tickets: #110, #112, #114, #116, #117.
