# Shared end-to-end tests

`@comet/e2e` owns Playwright configuration, desktop launch/upload helpers,
reusable conversion page actions, native fixtures, and conversion coverage. It
is a test workspace; applications must not depend on it at runtime.

## Run

From the repository root, using the Node/npm versions in `.nvmrc`:

```sh
npm ci
npm run binaries
npm run build
npm run test:matrix
npm run package
npm run test:packaged
```

`npm run test:matrix` builds engine/contracts dependencies and runs the native
conversion project. It does not launch a browser. `npm run test:e2e` runs the
desktop project against the development build or `COMET_EXECUTABLE`.
`test:packaged` verifies native resources, copies the packaged application
outside the checkout, and runs the same desktop suite against that copy.

Reports, traces, and failure screenshots live in `playwright-report/` and
`test-results/` within this workspace. Desktop and native projects have separate
artifact directories so they can run concurrently. CI uploads diagnostics even
when a test fails. The target-specific `native-matrix/matrix-*.json` report
classifies each requested pair and includes fixture provenance and input gaps.

## Conversion coverage

The matrix exercises every accepted source extension against each advertised
output within its media category. Video also exercises audio extraction and
frame saving. It generates small, real files using the staged native tools, uses
the production executor, probes each output, and decodes it with FFmpeg. It
checks source hashes and temporary-file cleanup. The desktop project clicks the
real format picker and converts a sample into every enabled output; it also
checks disabled formats, cancellation, settings, restart, and legacy migration.

A missing encoder is classified as unavailable. A missing audio track is an
expected rejection for audio extraction. A missing input fixture is explicitly
untested, never reported as a successful conversion. Failures are not retried or
hidden by capability filtering. A custom reporter aggregates across failed
worker restarts, preserving earlier results and unrun cases.

AMR, APE, and MPC inputs currently require external fixtures on the local macOS
ARM64 build. Supply actual small samples named `audio.amr`, `audio.ape`, and
`audio.mpc` in an absolute directory:

```sh
COMET_MEDIA_FIXTURES=/absolute/path/to/samples \
COMET_REQUIRE_INPUT_COVERAGE=1 npm run test:matrix
```

The strict flag fails if any accepted input lacks a fixture. External samples
are probed and decoded before use; a wrong extension alone does not provide
meaningful coverage. Validate sample provenance before committing fixtures.

This matrix verifies representative codecs/options, not every possible codec
inside each container, corrupted file, encryption scheme, or animation. Audio
and images are not turned into video or into each other; those would require new
product features. Platform results apply only to the tools tested on that
OS/architecture.

## Reuse in the future web app

There is no web application in this repository yet, so there is no passing web
suite or simulated web conversion backend. When it exists, it can import:

- `@comet/e2e/config`: `createTestConfig(options, reportName)` supplies shared
  timeouts, traces, screenshots, and reports; pass the web app's `webServer`,
  `baseURL`, projects, and test directory as options.
- `@comet/e2e/converter-page`: `ConverterPage` drives accessible tabs, format
  selection, file submission, Convert, and completion status. Its default
  uploader uses browser `setInputFiles`; desktop injects `selectDesktopFiles`
  because Electron needs real native file paths.
- `@comet/e2e/media`: native seed generation and output verification, for use in
  the Node test process. Keep these imports out of browser/application code.

The page object currently uses English conversion control names. Web tests
should initialize that locale or adapt the actions to their localized labels. A
future web test must also verify the actual downloaded result from its real
conversion service; reaching a success label alone is not sufficient.

Browser harness and adapter contract commands are documented in
[adapter contract testing](../../docs/architecture/adapter-contract-testing.md).
