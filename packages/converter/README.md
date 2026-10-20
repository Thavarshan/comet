# @honeymelon/converter

Reusable React conversion features for desktop and browser hosts. The package
owns media navigation, drafts, queue presentation, output controls,
initialization recovery, and revisioned queue subscriptions. Scheduling and job
lifecycle stay in the injected `ConversionService`.

## Host contract

Wrap `ConverterWorkspace` in `ConverterProvider`, supplying a stable
`ConverterPlatform`, portable preferences, and an async preference-change
callback. Supply a host-configured `I18nextProvider` using `converterMessages`
for English, Spanish, French, German, and Russian. The package never initializes
a global i18n instance or changes document appearance by itself.

Import `@honeymelon/ui/styles/globals.css` and
`@honeymelon/converter/styles.css` through the host's Tailwind build. The
converter stylesheet declares its source directory for utility scanning. The
host supplies a bounded-height flex container, theme class, document language,
and global typography.

`ConverterPlatform` exposes:

- `service`: capability discovery, probing, submission, snapshots and cancel.
- `intake`: registers browser `File` objects in the host and returns opaque
  descriptors. The shared package retains metadata only.
- `removeItem` and `clearMedia`: remove rows through the authoritative adapter.
- Optional `mediaTypes`: restrict navigation for an image-only host.
- Optional destination picker and input descriptions.
- Optional output action: a localized label, reveal/download icon choice, and
  callback. No output action appears without host support.

Use the `toolbar` slot for host settings. Window controls, native menus,
preference storage/migration, downloaded output bytes, and file handles belong
to hosts. A directory is represented by an opaque target and display labels;
shared components never parse native paths or import native request schemas.

The provider subscribes before fetching the initial snapshot, ignores older
revisions, and cleans up only its own subscription. It never disposes a service
from a React effect: Strict Mode and renderer reload must not stop living jobs.
The host owns service lifetime. Source inspection has independent abort signals
and stops when a row unmounts.

Submitted jobs may carry an opaque `target` so retry retains the original
destination along with format/spec, even after editing the next submission. The
desktop transport adapter reconstructs these handles from living native jobs
after a renderer reload. Full application restart still starts an empty queue.

## Verification

`npm test -w @honeymelon/converter` mounts the actual workspace under Strict
Mode with a browser-style mock host and no Electron global. It checks portable
submission, progress/cancel, optional download actions, subscription and probe
cleanup, stale initial snapshots, initialization recovery, and all five locales.
The mock emits test snapshots; it does not claim to encode images.

Desktop DOM tests and packaged Electron E2E continue exercising this same
workspace through the real preload adapter. Narrow layout rules are included.
The E2E workspace now mounts this UI over the unsupported browser adapter in
Chromium, Firefox, and WebKit configurations. This checks browser boundaries and
unavailable states, not real image encoding. The production browser image
adapter remains unimplemented.

## Commands and package output

Run commands from the repository root with Node.js 24.22.0 and npm 12.2.0.
Install once with `npm ci`; run `npm run build:packages` before invoking
workspace checks directly so dependency exports exist. Root `npm run typecheck`
and `npm test` use Turbo to build upstream packages automatically.

```sh
npm run build -w @honeymelon/converter
npm run typecheck -w @honeymelon/converter
npm test -w @honeymelon/converter
npm run dev -w @honeymelon/converter
```

TypeScript emits `dist/` JavaScript and declarations; `dev` watches those
exports. `@honeymelon/converter/styles.css` exports source CSS. Runtime
dependencies include contracts, core, UI, and localization helpers; React/React
DOM are peers. There is no standalone app server in this workspace. The desktop
is the real conversion host; the browser fixture is test infrastructure.

See [service ownership](../../docs/architecture/conversion-services.md) and
[adapter/browser testing](../../docs/architecture/adapter-contract-testing.md).
