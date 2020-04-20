#!/bin/bash

# metadata
cp ./metadata/empty-tiddlywiki.info ./build/tiddlywiki.info > /dev/null 2>&1

# build
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
# build
npx tiddlywiki build \
  --output wiki \
  --build \
  --verbose \
|| exit 1

exit 0
