#!/bin/bash
# cleanup
rm -f -R ./build > /dev/null 2>&1
# plugin directory
mkdir -p ./build/plugins/ipfs > /dev/null 2>&1
# wiki directory
mkdir ./build/tiddlers > /dev/null 2>&1
# plugin scripts
cp ./src/ens-wrapper.js ./build/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-saver.js ./build/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-startup.js ./build/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-utils.js ./build/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-version.js ./build/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-wrapper.js ./build/plugins/ipfs > /dev/null 2>&1
# plugin tiddlers
cp -R ./tiddlers/plugin/* ./build/plugins/ipfs > /dev/null 2>&1
# wiki tiddlers
cp -R ./tiddlers/wiki/* ./build/tiddlers > /dev/null 2>&1
# metadata
cp ./src/tiddlywiki.files ./build > /dev/null 2>&1
cp ./src/tiddlywiki.info ./build > /dev/null 2>&1
# plugin.info
cp ./src/plugin.info ./build/plugins/ipfs > /dev/null 2>&1
# tw5-kin-filter
cp -R ./tw5-kin-filter/plugins/kin-filter ./build/plugins/kin-filter > /dev/null 2>&1
# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1

exit 0
