#!/bin/bash
# cleanup
rm -f -R ./build > /dev/null 2>&1
rm -f -R ./tw5-locator > /dev/null 2>&1

./scripts/run-prepare-clone.sh || exit 1

./scripts/run-prepare.sh || exit 1

./scripts/run-browserify.sh || exit 1

./scripts/build-tiddlywiki-ipfs-dev.sh || exit 1

./scripts/build-tiddlywiki-ipfs.sh || exit 1

exit 0
