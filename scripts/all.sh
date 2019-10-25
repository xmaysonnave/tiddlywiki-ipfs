#!/bin/bash
./scripts/prepare.sh
# browserify -s _ ipfs-library.js -o ipfs/plugins/ipfs/ipfs-library.js || exit 1
npx browserify \
  src/ipfs-library.js \
  -s IpfsLibrary \
  -o ipfs/plugins/ipfs/ipfs-library.js || exit 1
npx tiddlywiki ipfs \
  --output ipfs/output/base \
  --build \
  --verbose || exit 1
npx tiddlywiki ipfs \
  --import tw5-cardo/Cardo-1.0.4.json application/json \
  --output ipfs/output/cardo \
  --build \
  --verbose || exit 1
