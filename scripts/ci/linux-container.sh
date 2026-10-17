#!/usr/bin/env bash
# Runs inside an ephemeral compatibility container, never on a user's system.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
if command -v apt-get >/dev/null; then
  apt-get update
  gtk=libgtk-3-0
  audio=libasound2
  if apt-cache show libgtk-3-0t64 >/dev/null 2>&1; then
    gtk=libgtk-3-0t64
    audio=libasound2t64
  fi
  apt-get install -y --no-install-recommends \
    xvfb xauth "$gtk" libnss3 "$audio" libgbm1 libxss1 \
    libdrm2 ca-certificates util-linux passwd
elif command -v dnf >/dev/null; then
  dnf install -y xorg-x11-server-Xvfb xorg-x11-xauth gtk3 nss alsa-lib \
    mesa-libgbm libXScrnSaver libdrm util-linux shadow-utils tar gzip
elif command -v zypper >/dev/null; then
  zypper --non-interactive install xorg-x11-server-Xvfb xauth xvfb-run libgtk-3-0 \
    mozilla-nss libasound2 libgbm1 libXss1 libatk-bridge-2_0-0 libdrm2 \
    util-linux shadow tar gzip
elif command -v pacman >/dev/null; then
  pacman -Syu --noconfirm xorg-server-xvfb xorg-xauth gtk3 nss alsa-lib \
    mesa libxss at-spi2-core libdrm util-linux shadow tar gzip
else
  echo 'Unsupported compatibility test image' >&2
  exit 1
fi

cd /work
tar -xzf /payload/linux-payload.tar.gz
# Chromium's setuid sandbox must remain root-owned while the app runs unprivileged.
chown root:root "apps/desktop/out/Comet-${COMET_TARGET}/chrome-sandbox"
chmod 4755 "apps/desktop/out/Comet-${COMET_TARGET}/chrome-sandbox"
useradd --create-home --uid 1500 comet-ci
mkdir -p packages/e2e/playwright-report packages/e2e/test-results
chown -R comet-ci packages/e2e/playwright-report packages/e2e/test-results
export PATH="/node/bin:$PATH"
export COMET_EXECUTABLE="/work/apps/desktop/out/Comet-${COMET_TARGET}/Comet"
export HOME=/home/comet-ci
# Native FFmpeg/FFprobe and image worker are supplied by the native build job.
runuser -u comet-ci -- xvfb-run --auto-servernum npm run test:e2e
