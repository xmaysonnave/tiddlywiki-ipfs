#!/bin/bash
./scripts/run-prepare.sh || exit 1

./scripts/run-browserify.sh || exit 1

./scripts/build-tiddlywiki-ipfs-dev.sh || exit 1

./scripts/build-tiddlywiki-ipfs.sh || exit 1

exit 0
