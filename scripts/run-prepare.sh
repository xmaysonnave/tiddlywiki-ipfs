#!/bin/bash
# cleanup
rm -f -R ./build > /dev/null 2>&1
# plugin directory
mkdir -p ./build/plugins/ipfs/core > /dev/null 2>&1
mkdir -p ./build/plugins/ipfs/files > /dev/null 2>&1
# core scripts
cp -R ./src/core/* ./build/plugins/ipfs/core > /dev/null 2>&1
# don't copy sub-directories, they are meant to be bundled
cp ./src/* ./build/plugins/ipfs > /dev/null 2>&1
# plugin tiddlers
cp -R ./tiddlers/plugin/* ./build/plugins/ipfs > /dev/null 2>&1
# modules
cp ./metadata/tiddlywiki.files ./build/plugins/ipfs/files > /dev/null 2>&1
# loglevel
mkdir -p ./build/plugins/ipfs/files/loglevel > /dev/null 2>&1
cp -R ./node_modules/loglevel/lib/loglevel.js ./build/plugins/ipfs/files/loglevel > /dev/null 2>&1
cp -R ./node_modules/loglevel/LICENSE-MIT ./build/plugins/ipfs/files/loglevel > /dev/null 2>&1
# generate build number
./scripts/run-build-number.sh || exit 1

exit 0