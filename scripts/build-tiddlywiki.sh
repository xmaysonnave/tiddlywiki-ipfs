#!/bin/bash
# metadata
cp ./metadata/empty-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# build empty wiki
yarn tiddlywiki build \
  --output wiki \
  --build \
  --verbose \
|| exit 1

# bluelightav directory
mkdir -p ./build/tiddlers > /dev/null 2>&1

# bluelightav tiddlers
cp -R ./tiddlers/wiki/* ./build/tiddlers > /dev/null 2>&1

# metadata
cp ./metadata/bluelightav-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1

# tw5-relink
cp -R ./tw5-relink/plugins/relink ./build/plugins/relink > /dev/null 2>&1

# build prod wiki
yarn tiddlywiki build \
  --output wiki \
  --build \
  --verbose \
|| exit 1

# dev bluelightav tiddlers
cp -R ./tiddlers/dev/* ./build/tiddlers > /dev/null 2>&1

# metadata
cp ./metadata/dev-bluelightav-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# build dev wiki
yarn tiddlywiki build \
  --output wiki \
  --build \
  --verbose \
|| exit 1

# compress
yarn gzipper compress --brotli wiki/empty.html output
yarn gzipper compress --brotli wiki/dev.html output
yarn gzipper compress --brotli wiki/index.html output
yarn gzipper compress --brotli wiki/tiddlywiki-ipfs-plugin.json output
cd ..

exit 0
