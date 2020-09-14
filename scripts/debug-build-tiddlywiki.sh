#!/usr/bin/env bash

# empty edition
cp -R ./editions/empty/* ./build > /dev/null 2>&1

# build
node --inspect ./ipfs-tiddlywiki.js build \
  --output production \
  --build \
  --verbose \
|| exit 1

# cleanup
rm -f -R ./temp > /dev/null 2>&1

exit 0
