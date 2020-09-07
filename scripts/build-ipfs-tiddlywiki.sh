#!/usr/bin/env bash

# cleanup
rm -f -R ./temp > /dev/null 2>&1

# build tiddlywiki5.js
cp -R ./editions/build-ipfs-library.js/* ./build > /dev/null 2>&1
# build
yarn ipfs-tiddlywiki build \
  --build \
  --verbose \
|| exit 1

# cleanup system
rm -f -R ./build/tiddlers/system > /dev/null 2>&1
# build final system
mkdir -p ./build/tiddlers/system > /dev/null 2>&1
cp ./tiddlers/system/ipfs-library.js.meta ./build/tiddlers/system > /dev/null 2>&1
cp ./build/output/ipfs-library.js ./build/tiddlers/system > /dev/null 2>&1
# build ipfs tiddywiki artifacts
cp -R ./editions/build-ipfs-tiddlywiki/* ./build > /dev/null 2>&1

# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

exit 0
