#!/bin/bash
# cleanup
rm -f -R ./ipfs > /dev/null 2>&1
# ipfs directory
mkdir -p ./ipfs/plugins/ipfs > /dev/null 2>&1
# ipfs scripts
cp ./src/ens-wrapper.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-saver.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-startup.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-utils.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-version.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-wrapper.js ./ipfs/plugins/ipfs > /dev/null 2>&1
# ipfs tiddlers
cp -R ./tiddlers/* ./ipfs/plugins/ipfs > /dev/null 2>&1
# metadata
cp ./src/tiddlywiki.files ./ipfs > /dev/null 2>&1
cp ./src/tiddlywiki.info ./ipfs > /dev/null 2>&1
# plugin.info
cp ./src/plugin.info ./ipfs/plugins/ipfs > /dev/null 2>&1
# tw5-kin-filter plugin
cp -R ./tw5-kin-filter/plugins/kin-filter ./ipfs/plugins/kin-filter > /dev/null 2>&1
# tw5-locator plugin
cp -R ./tw5-locator/plugins/locator ./ipfs/plugins/locator > /dev/null 2>&1
