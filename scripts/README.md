# Repository tooling

Keep runnable repository commands in this directory. Import-only helpers belong
in `lib/`, their Node tests in `tests/`, and CI shell entry points in `ci/`.
Desktop build and development commands live in `apps/desktop/scripts/`; website
commands live in `apps/site/scripts/`.

| Entry point            | Purpose / caller                                          |
| ---------------------- | --------------------------------------------------------- |
| `check-boundaries.mjs` | Enforce workspace dependencies during root lint           |
| `check-sarif.mjs`      | Reject security findings in the security workflow         |
| `prepare-tools.mjs`    | Repair the Windows installer dependency after install     |
| `stage-binaries.mjs`   | Download and verify native tools for Forge packaging      |
| `portable.mjs`         | Create Linux portable archives (`npm run dist:portable`)  |
| `verify-packaged.mjs`  | Verify packaged imports, native tools and signatures      |
| `test-packaged.mjs`    | Test an isolated package and write release receipts       |
| `validate-tag.mjs`     | Validate the release tag and emit the signing requirement |
| `prepare-release.mjs`  | Verify receipts and assemble release assets/checksums     |

Run `npm run test:ci` from the repository root to test the tooling. Keep the
small release entry points separate: tag validation runs before native builds,
while asset preparation runs after every target has supplied verified artifacts.
Both use the same tag validation in `lib/release-policy.mjs`.

The binary manifest, checksum checks, signing policy, packaging verification and
CI shell scripts are active build/release safeguards. Update their callers and
tests together when changing them.
