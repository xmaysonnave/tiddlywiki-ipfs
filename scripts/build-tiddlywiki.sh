#!/bin/bash

# TiddlyWiki5
cp -R ./TiddlyWiki5/* ./node_modules/tiddlywiki > /dev/null 2>&1
cp ./eth-sig-util/eth-sig-util.min.js ./node_modules/tiddlywiki/boot > /dev/null 2>&1

# metadata
cp ./metadata/empty-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# build empty wiki
npx tiddlywiki build \
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
npx tiddlywiki build \
  --output wiki \
  --build \
  --verbose \
|| exit 1

# dev bluelightav tiddlers
cp -R ./tiddlers/dev/* ./build/tiddlers > /dev/null 2>&1

# metadata
cp ./metadata/dev-bluelightav-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# build dev wiki
npx tiddlywiki build \
  --output wiki \
  --build \
  --verbose \
|| exit 1

# compress
cd wiki
npx gzipper ./empty.html ../output
npx gzipper ./dev.html ../output
npx gzipper ./index.html ../output
npx gzipper ./tiddlywiki-ipfs-plugin.json ../output
cd ..

exit 0
