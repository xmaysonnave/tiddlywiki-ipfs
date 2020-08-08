#!/bin/bash

# empty edition
cp -R ./editions/empty/* ./build > /dev/null 2>&1

# build
yarn tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

# bluelightav edition
cp -R ./editions/bluelightav.eth/* ./build > /dev/null 2>&1

# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1

# tw5-relink
cp -R ./tw5-relink/plugins/relink ./build/plugins/relink > /dev/null 2>&1

# build
yarn tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

# dev bluelightav edition
cp -R ./editions/dev/* ./build > /dev/null 2>&1

# build
yarn tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

# compress
# yarn gzipper compress --brotli production/empty.html sample
# yarn gzipper compress --brotli production/dev.html sample
# yarn gzipper compress --brotli production/index.html sample
# yarn gzipper compress --brotli production/tiddlywiki-ipfs-plugin.json sample

exit 0
