#!/bin/bash
yarn prettier-standard \
  --lint \
  --format \
|| exit 1

yarn browserify \
  src/plugins/ipfs/ipfs-bundle.js \
  -s IpfsBundle \
  -o build/plugins/ipfs/ipfs-bundle.js \
|| exit 1

exit 0
