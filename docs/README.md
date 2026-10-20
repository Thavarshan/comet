# Honeymelon technical documentation

Architecture contracts, operating procedures, and historical acceptance records
for the current monorepo. Issue status below was checked on 2026-10-19; consult
GitHub for live status before acting on a deployment or release.

## Current architecture and operations

- [ADR 0002: Honeymelon identity](architecture/0002-honeymelon-identity.md) —
  approved identifiers, preference import, coexistence and rollback.
- [Brand provenance](branding/provenance.md) — original assets and regeneration.

- [ADR 0001: local conversion platform](architecture/0001-local-conversion-platform.md)
  — original decision and implementation roadmap, with a current-state note.
- [Browser workspace contract and CI tiers](architecture/browser-workspaces.md)
  — dependency boundaries, Turbo, and CI coverage.
- [Platform conversion services](architecture/conversion-services.md) — shared
  service lifecycle, native adapter, and unsupported browser adapter.
- [Adapter contracts and browser tests](architecture/adapter-contract-testing.md)
  — current unit, browser, site, and native test scope.
- [Site publication contract](architecture/site-publication.md) — static export,
  SEO and publication gates.
- [Release centre operations](releases/release-center.md) — release snapshot
  refresh, trust and download selection.
- [Static site deployment](operations/site-deployment.md) — preview/production
  setup, verification and rollback.

## Acceptance and compatibility evidence

- [Desktop beta acceptance](releases/v3.0.0-beta.1-acceptance.md) — CI and
  release evidence plus remaining human sign-off.
- [Site P2.2 acceptance](releases/site-p2.2-acceptance.md) — historical
  source-delivery verification; it does not prove live deployment.
- `compatibility/*.json` — lab probe results retained with their tested
  runtime/tool versions. Re-run probes after dependency, browser, or bundler
  changes; these are not universal compatibility guarantees.

As of 2026-10-19, site implementation and the GitHub-backed Release Center
(#69–71) are closed. Cloudflare publication (#72) remains open. Browser image
conversion, file intake/export, worker scheduling/memory controls, and the
associated MVP preview (#74–77) remain open; `@honeymelon/browser-engine` is
still an unsupported stub. The marketing/download site is implemented; there is
no product web converter app yet.
