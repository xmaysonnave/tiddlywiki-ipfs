#!/bin/bash
npx prettier-standard \
  --lint \
  --format \
|| exit 1
npx browserify \
  src/ipfs-bundle.js \
  -s IpfsBundle \
  -o build/plugins/ipfs/ipfs-bundle.js \
  --noparse='$PWD/node_modules/universal-url-lite/lite.js' \
|| exit 1

exit 0