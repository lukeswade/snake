#!/bin/sh
# Stage the deployable site into dist/ — only runtime assets, no dev files.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir dist
cp index.html manifest.json sw.js _headers favicon.png icon.svg \
   apple-touch-icon.png icon-192.png icon-512.png og-image.jpg dist/
cp -R css js fonts dist/
echo "dist: $(find dist -type f | wc -l | tr -d ' ') files"
