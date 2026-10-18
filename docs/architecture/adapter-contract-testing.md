# Adapter and browser test contracts

Run `npm test -w @comet/e2e` for the shared service suite. The same observable
contracts run against `NativeConversionService` over its existing engine and the
browser-safe `QueueConversionService`. Both use controlled executors: these
tests prove scheduling, immutable admission, snapshots, progress, FIFO,
single-slot execution, collision naming in the fixture, failure advancement,
abort cleanup, repeated cancellation, disposal and independent unsubscribe. They
do not claim that a mock encoded real media. Native integration tests and
packaged platform tests retain actual output, collision and source-preservation
coverage. The browser's real encoder will join these contracts when implemented.

`QueueConversionService` uses the existing core lifecycle reducer and owns no
files, workers, Node modules or output bytes. Its executor supplies capability
discovery, admission validation, probing, execution, and idempotent cleanup. One
slot covers execution and draft inspection. Submitted jobs take priority over
queued inspections. Executors must settle after abort/resource termination;
adapters enforce their own deadlines. Cleanup failure is a failed job and a
rejected cancellation, never a falsely successful cancellation.

## Browser harness

The fixture mounts the real shared converter over the explicitly unsupported
browser stub. It needs no Cloudflare credentials, account, server conversion
API, or Electron bridge. Generated PNG/JPEG files are checked in under
`packages/e2e/fixtures/images`; no private sample media is used.

```sh
npm run build:packages
npm exec -w @comet/e2e -- playwright install chromium firefox webkit
npm run test:browser -w @comet/e2e
```

The script builds the fixture and launches a local static Vite preview. A
dedicated config prevents Vitest from collecting Playwright specs. Browser
projects reuse the common trace, screenshot, and report settings. The browser
suite rejects external requests and all methods except GET/HEAD while local
files are selected. A future app can supply `COMET_E2E_WEB_URL` to reuse the
same launch infrastructure without Cloudflare credentials.

Import UI and converter styles into one host CSS entry so Tailwind processes
both source declarations; importing separate styles directly from JavaScript can
leave a standalone `@source` directive unprocessed.

PR quality CI installs Chromium and runs the small harness. Failure traces,
screenshots and reports are retained seven days. Firefox/WebKit run locally now
and will join the complete image-MVP CI matrix in #77. Existing six-target
desktop packaged checks and eleven Linux distro jobs remain intact. The full
native conversion-pair matrix remains on main, schedules and release tags.
