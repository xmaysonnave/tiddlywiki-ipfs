#!/bin/bash
./scripts/run-prepare-clone.sh || exit 1

./scripts/run-prepare.sh || exit 1

./scripts/run-browserify.sh || exit 1

./scripts/build-tiddlywiki.sh || exit 1

exit 0
