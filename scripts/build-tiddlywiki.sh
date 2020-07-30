#!/bin/bash
# metadata
cp ./tiddlers/metadata/empty-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# build empty wiki
yarn tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

# bluelightav directory
mkdir -p ./build/tiddlers > /dev/null 2>&1

# bluelightav tiddlers
cp -R ./tiddlers/editions/bluelightav.eth ./build/tiddlers/editions > /dev/null 2>&1

# metadata
cp ./tiddlers/metadata/bluelightav-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1

# tw5-relink
cp -R ./tw5-relink/plugins/relink ./build/plugins/relink > /dev/null 2>&1

# build prod wiki
yarn tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

# dev bluelightav tiddlers
cp -R ./tiddlers/editions/dev ./build/tiddlers/editions > /dev/null 2>&1

# metadata
cp ./tiddlers/metadata/dev-bluelightav-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# build dev wiki
yarn tiddlywiki build \
  --output production \
  --build \
  --verbose \
|| exit 1

# compress
yarn gzipper compress --brotli production/empty.html sample
yarn gzipper compress --brotli production/dev.html sample
yarn gzipper compress --brotli production/index.html sample
yarn gzipper compress --brotli production/tiddlywiki-ipfs-plugin.json sample
cd ..

exit 0
