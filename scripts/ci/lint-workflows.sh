#!/usr/bin/env bash
# Pin both the workflow linter version and the downloaded executable archive.
set -euo pipefail
archive="$RUNNER_TEMP/actionlint.tar.gz"
curl --fail --silent --show-error --location \
  https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz \
  --output "$archive"
echo "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8  $archive" \
  | sha256sum --check
mkdir -p "$RUNNER_TEMP/actionlint"
tar -xzf "$archive" -C "$RUNNER_TEMP/actionlint"
"$RUNNER_TEMP/actionlint/actionlint" -shellcheck= .github/workflows/*.yml
for script in scripts/ci/*.sh; do
  bash -n "$script"
done
shellcheck scripts/ci/*.sh
