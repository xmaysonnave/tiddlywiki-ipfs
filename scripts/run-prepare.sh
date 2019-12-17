#!/bin/bash
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
# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1

exit 0