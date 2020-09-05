#!/usr/bin/env bash

# cleanup
rm -f -R ./temp > /dev/null 2>&1

# build directories
mkdir ./temp > /dev/null 2>&1

# build tiddlywiki5.js
cp -R ./editions/build-tiddlywiki5.js/* ./build > /dev/null 2>&1

# build
yarn ipfs-tiddlywiki build \
  --output temp \
  --build \
  --verbose \
|| exit 1

rm -f -R ./build/tiddlers/system > /dev/null 2>&1
mkdir -p ./build/tiddlers/system > /dev/null 2>&1
cp ./tiddlers/system/tiddlywiki5.js.meta ./build/tiddlers/system > /dev/null 2>&1
cp ./temp/tiddlywiki5.js ./build/tiddlers/system > /dev/null 2>&1

# cleanup
rm -f -R ./temp > /dev/null 2>&1

# build ipfs tiddywiki artifacts
cp -R ./editions/build-ipfs-tiddlywiki/* ./build > /dev/null 2>&1

# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

exit 0
