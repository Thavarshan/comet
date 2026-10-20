# @honeymelon/engine

Node-based, Electron-free native media conversion. The desktop main process uses
this package; browser and renderer code must not import it.

## Ownership and API

Import from `@honeymelon/engine`. The public surface includes
`ConversionEngine`, `NativeConversionService`, executor creation, capability
detection, image conversion, and the native process runner. `EnginePaths`
identifies the host's resources. Compiled JavaScript and declarations are
emitted to `dist/`.

- `src/index.ts`: authoritative FIFO queue, admission, inspection priority,
  snapshots, cancellation, and shutdown. One slot stays occupied until native
  execution and cleanup settle.
- `src/service.ts`: portable service adapter, mapping opaque input/destination
  handles to trusted native resources and projecting path-free queue views.
- `src/adapter.ts` and `src/image-worker.ts`: native execution, image work,
  temporary outputs, cleanup, and collision-safe publication.
- `src/metadata.ts`, `src/options.ts`, `src/profiles.ts`, `src/process.ts`:
  probing, argument validation, capability detection, and process control.

Contracts validate native requests; core supplies platform-neutral lifecycle
rules and service types. This package depends on Jimp plus contracts/core, and
uses staged FFmpeg/FFprobe tools for native media operations. Supported outputs
vary by platform encoders/muxers; a catalogue entry is not a capability promise.

## Commands and prerequisites

Run commands from the repository root with Node.js 24.22.0 and npm 12.2.0.
Install once with `npm ci`; run `npm run build:packages` before invoking
workspace checks directly so dependency exports exist. Root `npm run typecheck`
and `npm test` use Turbo to build upstream packages automatically.

```sh
npm run build -w @honeymelon/engine
npm run typecheck -w @honeymelon/engine
npm test -w @honeymelon/engine
npm run binaries
npm run test:integration
npm run test:matrix
```

Unit tests use controlled dependencies. Integration and matrix tests require
actual staged tools for the host target. Native integration covers real outputs,
source preservation, and collision handling; the matrix reports unavailable
encoders and missing input fixtures separately from successful conversions.
`npm run dev -w @honeymelon/engine` watches TypeScript output.

The host owns service disposal and must wait for cleanup at shutdown. No queue
replay or persistent job restoration is provided. See the
[service lifecycle](../../docs/architecture/conversion-services.md) and
[E2E/fixture guide](../e2e/README.md).
