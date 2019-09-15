#!/bin/bash
./scripts/prepare.sh
# browserify -s _ ipfs-saver.js -o ipfs/plugins/ipfs/ipfs-saver.js || exit 1
browserify src/ipfs-saver.js -s ipfsSaver -o ipfs/plugins/ipfs/ipfs-saver.js || exit 1
tiddlywiki ipfs --output ipfs/output/base --build --verbose || exit 1
tiddlywiki ipfs --import tw5-cardo/Cardo-1.0.4.json application/json --output ipfs/output/cardo --build --verbose || exit 1
