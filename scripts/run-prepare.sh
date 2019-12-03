#!/bin/bash
# cleanup
rm -f -R ./build > /dev/null 2>&1
rm -f -R ./tw5-kin-filter > /dev/null 2>&1
rm -f -R ./tw5-locator > /dev/null 2>&1
# plugin directory
mkdir -p ./build/plugins/ipfs > /dev/null 2>&1
# wiki directory
mkdir -p ./build/tiddlers > /dev/null 2>&1
# ipfs scripts
cp -R ./src/* ./build/plugins/ipfs > /dev/null 2>&1
# plugin tiddlers
cp -R ./tiddlers/plugin/* ./build/plugins/ipfs > /dev/null 2>&1
# wiki tiddlers
cp -R ./tiddlers/wiki/* ./build/tiddlers > /dev/null 2>&1
# metadata
cp ./metadata/tiddlywiki.files ./build > /dev/null 2>&1
cp ./metadata/tiddlywiki.info ./build > /dev/null 2>&1
cp ./metadata/plugin.info ./build/plugins/ipfs > /dev/null 2>&1
# tw5-kin-filter
git clone https://github.com/bimlas/tw5-kin-filter
cd tw5-kin-filter
git checkout tags/v1.0.0 > /dev/null 2>&1
cd ..
cp -R ./tw5-kin-filter/plugins/kin-filter ./build/plugins/kin-filter > /dev/null 2>&1
# tw5-locator
git clone https://github.com/bimlas/tw5-locator
cd tw5-locator
git checkout tags/v1.5.0 > /dev/null 2>&1
cd ..
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1

exit 0