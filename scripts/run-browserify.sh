#!/usr/bin/bash
npx browserify \
  src/ipfs-library.js \
  -s IpfsLibrary \
  -o build/plugins/ipfs/ipfs-library.js || exit 1
npx browserify \
  src/ens-library.js \
  -s EnsLibrary \
  -o build/plugins/ipfs/ens-library.js || exit 1

  exit 0

