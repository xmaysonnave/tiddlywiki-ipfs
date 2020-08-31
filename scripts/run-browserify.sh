#!/usr/bin/env bash

yarn browserify \
  src/plugins/ipfs/ipfs-bundle.js \
  -s IpfsBundle \
  -o build/plugins/ipfs/ipfs-bundle.js \
|| exit 1

yarn browserify \
  node_modules/keccak/js.js \
  -s createKeccakHash \
  -o build/tiddlers/system/keccak.umd.js \
  || exit 1

yarn terser \
  build/tiddlers/system/keccak.umd.js \
  -c toplevel,sequences=false -m \
  -o build/tiddlers/system/keccak.umd.min.js \
  || exit 1

rm ./build/tiddlers/system/keccak.umd.js > /dev/null 2>&1

exit 0
