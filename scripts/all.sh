#!/bin/bash
./scripts/prepare.sh
# browserify -s _ ipfs-library.js -o ipfs/plugins/ipfs/ipfs-library.js || exit 1
browserify src/ipfs-library.js -s IpfsLibrary -o ipfs/plugins/ipfs/ipfs-library.js || exit 1
tiddlywiki ipfs \
  --import attachment/the_little_prince_embedded.json application/json \
  --import attachment/the_little_prince_ipfs_encrypted.json application/json \
  --import attachment/the_little_prince_ipfs.json application/json \
  --output ipfs/output/base \
  --build \
  --verbose || exit 1
tiddlywiki ipfs \
  --import attachment/the_little_prince_embedded.json application/json \
  --import attachment/the_little_prince_ipfs_encrypted.json application/json \
  --import attachment/the_little_prince_ipfs.json application/json \
  --import tw5-cardo/Cardo-1.0.4.json application/json \
  --output ipfs/output/cardo \
  --build \
  --verbose || exit 1
