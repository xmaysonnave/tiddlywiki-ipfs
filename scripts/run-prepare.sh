#!/bin/bash
# cleanup
rm -f -R ./build > /dev/null 2>&1
rm -f -R ./output > /dev/null 2>&1

# build directory
mkdir -p ./build/plugins/ipfs/core > /dev/null 2>&1

# temp output directory
mkdir -p ./build/output > /dev/null 2>&1

# core scripts
cp -R ./src/core/* ./build/plugins/ipfs/core > /dev/null 2>&1

# don't copy sub-directories, they are meant to be bundled
cp ./src/* ./build/plugins/ipfs > /dev/null 2>&1

# plugin tiddlers
cp -R ./tiddlers/plugin/* ./build/plugins/ipfs > /dev/null 2>&1

# modules
cp ./metadata/tiddlywiki.files ./build/plugins/ipfs/files > /dev/null 2>&1

# loglevel
cp -R ./loglevel ./build/plugins > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/loglevel@1.6.8/lib/loglevel.min.js -P ./build/plugins/loglevel > /dev/null 2>&1
wget https://raw.githubusercontent.com/pimterry/loglevel/master/LICENSE-MIT -P ./build/plugins/loglevel > /dev/null 2>&1

# generate build number
./scripts/run-build-number.sh \
|| exit 1

exit 0