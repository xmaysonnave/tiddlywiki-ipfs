#!/usr/bin/env bash

# empty edition
cp -R ./editions/empty/* ./build > /dev/null 2>&1

# build
yarn tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

# compress
# yarn gzipper compress --brotli production/empty.html sample

exit 0
