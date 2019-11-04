#!/bin/bash
npx browserify \
  src/ipfs-library.js \
  -s IpfsLibrary \
  -o ipfs/plugins/ipfs/ipfs-library.js || exit 1
npx browserify \
  src/ens-library.js \
  -s EnsLibrary \
  -o ipfs/plugins/ipfs/ens-library.js || exit 1

