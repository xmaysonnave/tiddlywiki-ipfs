#!/bin/bash
# cleanup
rm -f -R ./build > /dev/null 2>&1
rm -f -R ./sample > /dev/null 2>&1

# build directories
mkdir -p ./build/editions > /dev/null 2>&1
mkdir -p ./build/plugins/ipfs > /dev/null 2>&1
mkdir ./sample > /dev/null 2>&1

# core scripts
cp -R ./src/plugins/ipfs/core ./build/plugins/ipfs > /dev/null 2>&1

# don't copy sub-directories, they are meant to be bundled
cp ./src/plugins/ipfs/* ./build/plugins/ipfs > /dev/null 2>&1

# plugin tiddlers
cp -R ./tiddlers/plugins/ipfs ./build/plugins > /dev/null 2>&1

# TiddlyWiki5
cp -R ./src/boot/* ./node_modules/tiddlywiki/boot > /dev/null 2>&1
cp -R ./tiddlers/boot/* ./node_modules/tiddlywiki/boot > /dev/null 2>&1
cp ./eth-sig-util/eth-sig-util.min.js ./node_modules/tiddlywiki/boot > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/@metamask/detect-provider@1.1.0/dist/detect-provider.min.js -O ./node_modules/tiddlywiki/boot/detect-provider.min.js
wget https://cdn.jsdelivr.net/npm/pako@1.0.11/dist/pako.min.js -O ./node_modules/tiddlywiki/boot/pako.min.js

# cp -R ./tiddlers/editions/empty ./build/editions > /dev/null 2>&1
# cp -R ./tiddlers/editions/full ./build/editions > /dev/null 2>&1
# cp -R ./tiddlers/editions/tw5.com ./build/editions > /dev/null 2>&1
# cp -R ./tiddlers/plugins/tiddlywiki/* ./build/plugins/ipfs > /dev/null 2>&1

# loglevel
cp -R ./tiddlers/metadata/loglevel ./build/plugins > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/loglevel@1.6.8/lib/loglevel.min.js -O ./build/plugins/loglevel/loglevel.min.js
cp ./node_modules/loglevel/LICENSE-MIT ./build/plugins/loglevel > /dev/null 2>&1

# generate build number
./scripts/run-build-number.sh \
|| exit 1

exit 0
