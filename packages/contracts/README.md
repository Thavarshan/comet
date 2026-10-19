# @comet/contracts

Browser-safe shared types and Zod validation for the Comet workspaces. This is
an internal, private package; its `0.1.0` version is not a published npm
release.

## Public surface

Import from `@comet/contracts`; compiled JavaScript and declarations are emitted
to `dist/`.

| Source              | Responsibility                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`      | Media/format catalogues, jobs and queues, capabilities, batch validation, preferences and migration, IPC channels, replies, and desktop bridge types |
| `src/conversion.ts` | Discriminated conversion settings and defaults                                                                                                       |
| `src/releases.ts`   | Release manifest, published release, and download asset types                                                                                        |

The catalogue describes possible formats; runtime capability discovery decides
which a platform can actually provide. A type or valid format name does not
prove an encoder exists. Native batch/path DTOs and desktop bridge types coexist
here with portable domain types; shared browser workflows use the opaque handle
service types defined in `@comet/core` rather than interpreting native paths.

This package depends on Zod and must remain free of Node, Electron, filesystem,
and native engine imports. Engine, core, converter, browser adapter, desktop,
site, and test tooling consume relevant parts of its exported contract.

## Commands

Run commands from the repository root with Node.js 24.22.0 and npm 12.2.0.
Install once with `npm ci`; run `npm run build:packages` before invoking
workspace checks directly so dependency exports exist. Root `npm run typecheck`
and `npm test` use Turbo to build upstream packages automatically.

```sh
npm run build -w @comet/contracts
npm run typecheck -w @comet/contracts
npm test -w @comet/contracts
npm run dev -w @comet/contracts
```

`dev` watches TypeScript output. Tests cover contract validation and migration.
When changing a schema, update its consumers and rejection/default tests;
TypeScript types alone do not validate an untrusted IPC payload.

See [conversion services](../../docs/architecture/conversion-services.md).
