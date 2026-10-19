# @comet/browser-engine

The browser-side implementation point for `ConversionService`. **Currently an
explicit unsupported stub, not a working image or media converter.** There is no
`apps/web` application in the repository.

## Current behavior

`BrowserConversionService`, exported from `@comet/browser-engine`, implements
the service contract from `@comet/core`:

- Capability discovery marks every video, audio, and image output unavailable
  with an explanation.
- Probe and enqueue reject with `ConversionServiceError` (`unsupported`); an
  already-aborted probe respects its abort signal.
- Snapshots are empty at revision zero; subscriptions produce no jobs/events.
- Unknown job/batch cancellation returns `not-found`.
- Disposal closes the service; later commands reject with `disposed`.

It starts no encoding workers, retains no media bytes, and uploads nothing. The
browser E2E harness mounts the actual shared converter over this stub to verify
the unavailable state and browser boundaries. Passing those tests does not
demonstrate successful encoding or download.

## Build and checks

Run commands from the repository root with Node.js 24.22.0 and npm 12.2.0.
Install once with `npm ci`; run `npm run build:packages` before invoking
workspace checks directly so dependency exports exist. Root `npm run typecheck`
and `npm test` use Turbo to build upstream packages automatically.

```sh
npm run build -w @comet/browser-engine
npm run typecheck -w @comet/browser-engine
npm test -w @comet/browser-engine
npm run test:browser
```

Build runs TypeScript and Vite, emitting declarations and a self-contained
browser library in `dist/`. Vite rejects browser externalization warnings. `dev`
watches TypeScript output; it does not run a web application or the full Vite
bundle build. Dependencies are limited to contracts and core; do not add Node,
Electron, or native engine imports.

Real image decoding, encoding, resource limits, cancellation, export/download,
and browser compatibility remain implementation work. See
[conversion services](../../docs/architecture/conversion-services.md) and
[adapter/browser contracts](../../docs/architecture/adapter-contract-testing.md).
