#!/bin/bash
# cleanup
rm -f -R ./ipfs/plugins > /dev/null 2>&1
rm -f -R ./tw5-kin-filter > /dev/null 2>&1
rm -f -R ./tw5-locator > /dev/null 2>&1
rm -f -R ./tw5-cardo > /dev/null 2>&1
# ipfs directories
mkdir -p ./ipfs/plugins/ipfs > /dev/null 2>&1
# ipfs scripts
cp ./src/ipfs-saver.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-startup.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-utils.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-version.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-wrapper.js ./ipfs/plugins/ipfs > /dev/null 2>&1
# plugin.info
cp ./src/plugin.info ./ipfs/plugins/ipfs > /dev/null 2>&1
# tw5-kin-filter plugin
git clone https://github.com/bimlas/tw5-kin-filter --depth 1
cp -R ./tw5-kin-filter/plugins/kin-filter ./ipfs/plugins/kin-filter > /dev/null 2>&1
# tw5-locator plugin
git clone https://github.com/bimlas/tw5-locator --depth 1
cp -R ./tw5-locator/plugins/locator ./ipfs/plugins/locator > /dev/null 2>&1
# cardo plugin
mkdir tw5-cardo > /dev/null 2>&1
wget -P ./tw5-cardo http://cardo.wiki/Cardo-1.0.4.json
