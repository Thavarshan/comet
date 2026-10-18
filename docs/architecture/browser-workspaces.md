# Browser workspace contract

Related: [#64](https://github.com/Thavarshan/comet/issues/64) and
[ADR 0001](0001-local-conversion-platform.md).

## Runtime dependency rules

`npm run lint` builds internal declarations, runs typed ESLint, and executes the
syntax-aware workspace checker. New source workspaces are discovered
automatically. Unknown runtime packages require an explicit policy before they
pass. Test drivers and build configuration may use Node; application runtime
sources may not use test drivers as a dependency.

| Consumer         | Allowed internal runtime packages              |
| ---------------- | ---------------------------------------------- |
| contracts        | none                                           |
| core             | contracts                                      |
| converter        | core, contracts, ui                            |
| browser-engine   | core, contracts                                |
| ui               | none                                           |
| engine           | core, contracts                                |
| desktop renderer | core, contracts, converter, ui                 |
| web              | core, contracts, converter, browser-engine, ui |
| site             | ui                                             |

Node builtins, Electron, native executable packages and `@comet/e2e` are
prohibited in browser runtime code. Core/contracts and either engine cannot
import a UI framework. Engine may use Node but cannot import Electron. Desktop
main/preload retain their existing platform responsibilities.

The checker parses static imports, side-effect imports, re-exports, import
types, literal dynamic imports, and CommonJS imports. Browser computed imports
are rejected because their destinations cannot be verified. Relative
cross-workspace paths and TypeScript-resolved aliases receive the same
dependency check as package imports. Runtime/peer/optional dependencies are
checked even when unused in source; development-only tools remain separate.

This is not a proof that arbitrary third-party code is browser-compatible. Each
new web/site production build must also succeed without Node polyfills, and its
bundle/network tests must verify actual platform behavior. Source tests are not
a substitute for testing the emitted application.

## Package template

Use existing pinned root tooling; do not add a second lockfile or an unpinned
compiler. A new browser library starts with this package shape (change name and
include only dependencies actually imported):

```json
{
  "name": "@comet/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@comet/contracts": "*"
  }
}
```

The workspace's `tsconfig.json` extends the browser configuration rather than
inheriting ambient Node types from the monorepo installation:

```json
{
  "extends": "../../tsconfig.browser.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

Keep tests in their own typecheck configuration if they need Node globals. Use
runtime exports from `dist`, keep type exports adjacent, and declare workspace
dependencies so Turborepo orders `^build` correctly. Do not reach into sibling
`src/` directories to avoid building declarations. Set application build outputs
when adding web/site workspaces; Next.js export output must be included in its
Turbo task outputs rather than assuming every app emits `dist/`.

## CI tiers and reproduction

PR verification retains all six native build targets, integration tests,
packaged smoke tests, and the Linux distro matrix. PRs omit only the exhaustive
conversion pair matrix. Pushes to main, scheduled runs, manual CI, and release
tags retain the exhaustive matrix. Reusable verification defaults to exhaustive
so new callers cannot accidentally weaken release checks. Signing policy is
independent.

Quality checks run root unit tests and `npm run build:browser`, covering
internal packages and non-desktop applications as they are added. There are
currently no web/site applications; an absent future workspace is not a build
failure.

From a clean checkout using the pinned Node/npm versions:

```sh
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:ci
npm run build:browser
npm run build
```

The tooling tests create an isolated browser workspace and confirm forbidden
imports, aliases and manifest dependencies cause a nonzero exit with file/line
or package diagnostics. They also check valid native imports and browser-safe
edges. Full native packaging remains verified by CI and the immutable release
tag.
