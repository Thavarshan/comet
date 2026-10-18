# @comet/core

Platform-neutral conversion rules shared by desktop and future browser adapters.
The package imports contracts only; it has no Node, Electron, React, filesystem,
binary-discovery, or native process dependency. It builds with ambient Node
types disabled through `tsconfig.browser.json`.

## Ownership inventory

| Behavior                                                                   | Owner after this extraction                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Job states, lifecycle events, progress clamping, terminal/late-event rules | core                                                                   |
| FIFO next-job selection and one-live-batch-per-media eligibility           | core                                                                   |
| Output capability/codec eligibility                                        | core; native encoder argument validation remains in engine             |
| Monotonic snapshot acceptance and domain serialization                     | core                                                                   |
| Async execution slot, probing priority, abort/cleanup waiting, shutdown    | native engine; platform orchestration will use the service port in #66 |
| Native input/output paths, atomic output publishing, collision handling    | native adapter                                                         |
| File/Blob or native-path handle maps and user destination selection        | platform adapter                                                       |
| React context, themes/localization, native bridge subscriptions            | desktop, pending shared converter extraction in #67                    |

Native `Job` records structurally satisfy `ConversionJob`. The engine delegates
state decisions to the immutable reducer and applies the result to its existing
authoritative job record. It still holds one execution slot until native work
and cleanup finish. There is no renderer scheduler and no replay of serialized
jobs.

`cancel-requested` enters `canceling`; it does not claim cancellation is
complete. Only the adapter's cleanup-complete `canceled` event finishes
cancellation. Success/failure/progress events are ignored while canceling, and
all events are ignored after a terminal state. Timestamps come from adapters,
allowing deterministic tests without a platform clock dependency.

`serializeQueue` exports a typed domain view, omitting native path fields and
adapter handles even if a native record is supplied structurally. It is not an
untrusted-input decoder or permission to persist source media. Native request
validation remains in contracts. Separate portable requests, resource handles,
and conversion-service ports are the scope of #66.

## Verification

Core tests cover state transitions, cancellation races, repeated terminal
events, non-finite progress, FIFO selection, failure advancement, per-media
eligibility, codec/source-target availability, stale snapshots, and domain
serialization.

Existing engine queue tests continue to cover global concurrency, cancellation
cleanup waiting, shutdown, arrival order and immutable submissions. Native
integration tests retain real output/source-preservation/collision checks.
Desktop E2E tests verify picker flows, conversion, cancellation, restart
preferences, and legacy language/theme initialization.

Run `npm test -w @comet/core`, root `npm run lint` / `npm run typecheck`, native
`npm run test:integration`, and desktop `npm run test:e2e` after a desktop
build. Cross-platform packaged CI remains required before merging runtime
changes.
