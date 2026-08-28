#!/usr/bin/env bash
# Copy the shipping web bundle into native/www for the iOS shell.
#
# Deliberately a hand-kept include list: the app must bundle exactly what
# the game needs and nothing else. No service worker (the bundle IS the
# cache; native.js also skips registration in the shell), no manifest (no
# install UI in an installed app), no _headers/og-image (server concerns).
set -euo pipefail
cd "$(dirname "$0")"
ROOT=..
rm -rf www
mkdir -p www/css www/js www/fonts

cp "$ROOT/index.html" www/
cp "$ROOT/privacy.html" www/
cp "$ROOT/icon.svg" www/
cp "$ROOT/favicon.png" www/
cp "$ROOT/apple-touch-icon.png" www/
cp "$ROOT/icon-192.png" www/
cp "$ROOT/icon-512.png" www/
cp "$ROOT/css/styles.css" www/css/
cp "$ROOT"/js/*.js www/js/
cp "$ROOT"/fonts/*.woff2 www/fonts/

echo "www/ built: $(find www -type f | wc -l | tr -d ' ') files"
