#!/bin/bash
# cleanup
rm -f -R ./build > /dev/null 2>&1
rm -f -R ./sample > /dev/null 2>&1

# build directories
mkdir -p ./build/plugins/ipfs > /dev/null 2>&1
mkdir ./sample > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

# core ipfs plugin scripts
cp -R ./src/plugins/ipfs/core ./build/plugins/ipfs > /dev/null 2>&1
# don't copy sub-directories, they are meant to be bundled
cp ./src/plugins/ipfs/* ./build/plugins/ipfs > /dev/null 2>&1

# plugin tiddlers
cp -R ./plugins/ipfs ./build/plugins > /dev/null 2>&1

# system tiddlers
cp -R ./plugins/system ./build/tiddlers > /dev/null 2>&1

# libraries
wget https://cdn.jsdelivr.net/npm/@metamask/detect-provider@1.1.0/dist/detect-provider.min.js -O ./build/tiddlers/system/detect-provider.min.js
wget https://cdn.jsdelivr.net/npm/loglevel@1.6.8/dist/loglevel.min.js -O ./build/tiddlers/system/loglevel.min.js
wget https://cdn.jsdelivr.net/npm/pako@1.0.11/dist/pako.min.js -O ./build/tiddlers/system/pako.min.js

# boot
cp ./src/boot/boot.js ./node_modules/tiddlywiki/boot

# cp -R ./tiddlers/editions/empty ./build/editions > /dev/null 2>&1
# cp -R ./tiddlers/editions/full ./build/editions > /dev/null 2>&1
# cp -R ./tiddlers/editions/tw5.com ./build/editions > /dev/null 2>&1
# cp -R ./tiddlers/plugins/tiddlywiki/* ./build/plugins/ipfs > /dev/null 2>&1

# generate build number
./scripts/run-build-number.sh \
|| exit 1

exit 0
